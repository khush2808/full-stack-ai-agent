import { inngest } from "../client.js";
import { sendEmail } from "../../utils/mailer.js";
import User from "../../models/user.js";
import { NonRetriableError } from "inngest";
export const onUserSignup = inngest.createFunction(
  { id: "on-user-signup", retries: 2 },
  { event: "user/signup" },
  async ({ event, step }) => {
    try {
      const { email } = event.data;
      const user = await step.run.task("check-user-exists", async () => {
        const userObject = await User.findOne({ email });
        if (!userObject) {
          throw new NonRetriableError("User doesn't exists");
        }
        return userObject;
      });
      await step.run("send-welcome-email", async () => {
        const { email, name } = user;

        await sendEmail(
          email,
          "Welcome to the app",
          `Welcome ${name} to the app`
        );
      });
    } catch (error) {
      console.log("❌Error running step", error);
      return { success: false, error: error.message };
    }
  }
);
