import { Environment, Paddle } from "@paddle/paddle-node-sdk";

const paddleApiKey = process.env.PADDLE_API_KEY;
const paddleEnvironment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT;

if (!paddleApiKey) {
  throw new Error("Missing PADDLE_API_KEY.");
}

export const paddle = new Paddle(paddleApiKey, {
  environment:
    paddleEnvironment === "production"
      ? Environment.production
      : Environment.sandbox,
});
