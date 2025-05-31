import { inngest } from "../inngest/client.js";
import Ticket from "../models/ticket.js";

export const createTicket = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res
        .status(400)
        .json({ error: "Title and description are required" });
    }
    const ticket = await Ticket.create({
      title,
      description,
      createdBy: req.user._id,
    });
    await inngest.send({
      name: "ticket/created",
      data: {
        ticketId: ticket._id,
        title: ticket.title,
        description: ticket.description,
        createdBy: ticket.createdBy,
      },
    });
    return res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      ticket,
    });
  } catch (err) {
    console.error("error creating ticket", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};
export const getTickets = async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== "user") {
      const tickets = await Ticket.find()
        .populate("assignedTo", ["email", "_id"])
        .sort({ createdAt: -1 });
      return res.status(200).json({
        success: true,
        message: "Tickets fetched successfully",
        tickets,
      });
    } else {
      const tickets = await Ticket.find({ createdBy: user._id })
        .select("title description createdAt status")
        .sort({ createdAt: -1 });
      return res.status(200).json({
        success: true,
        message: "Tickets fetched successfully",
        tickets,
      });
    }
  } catch (err) {
    console.error("error fetching tickets", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};
