// Library imports
import { NonRetriableError } from "inngest";

// File imports
import { analyzeTicket } from "../../utils/ai.js";
import { sendMail } from "../../utils/mailer.js";
import Ticket from "../../models/ticket.js";
import { inngest } from "../client.js";
import User from "../../models/user.js";
export const onTicketCreated = inngest.createFunction(
  { id: "on-ticket-created", retries: 2 },
  { event: "ticket/created" },
  async ({ event, step }) => {
    try {
      const { ticketId } = event.data;
      const ticket = await step.run("fetch-ticket", async () => {
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
          throw new NonRetriableError("Ticket not found");
        }
        return ticket;
      });

      await step.run("update-ticket-status", async () => {
        await Ticket.findByIdAndUpdate(ticket._id, { status: "TODO" });
      });

      const aiResponse = await analyzeTicket(ticket);

      const relatedSkills = await step.run("ai-processing", async () => {
        let skills = [];
        if (aiResponse) {
          await Ticket.findByIdAndUpdate(ticket._id, {
            priority: !["low", "medium", "high"].includes(aiResponse.priority)
              ? "medium"
              : aiResponse.priority,
            helpfulNotes: aiResponse.helpfulNotes,
            status: "IN_PROGRESS",
            relatedSkills: aiResponse.relatedSkills,
          });
        }
        skills = aiResponse.relatedSkills;
        return skills;
      });
      const moderator = await step.run("assign-moderator", async () => {
        let user = await User.findOne({
          role: "moderator",
          skills: {
            $elemMatch: {
              $regex: relatedSkills.join("|"),
              $options: "i",
            },
          },
        });
        if (!user) {
          user = await User.findOne({
            role: "admin",
          });
        }
        await Ticket.findByIdAndUpdate(ticket._id, {
          assignedTo: user?._id || null,
        });
        return user;
      });
      await step.run("send-email-notification", async () => {
        if (moderator) {
          const finalTicket = await Ticket.findById(ticket._id);
          await sendMail({
            to: moderator.email,
            subject: "New Ticket Assigned",
            html: `<p> Hi , You have been assigned a new ticket. Please login to the dashboard to view the ticket. ${finalTicket.title}</p>`,
          });
        }
        return { success: true };
      });
    } catch (error) {
      console.error("Error in on-ticket-create", error.message);
      return { success: false };
    }
  }
);
