import { YogaInitialContext } from 'graphql-yoga';
import { PrismaClient, User } from '@prisma/client';
import { authenticateUser } from './auth';
import twilio from 'twilio';
import TwilioSDK from 'twilio';
import { Expo } from 'expo-server-sdk';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const prisma = new PrismaClient();
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_ACCOUNT_AUTH_TOKEN
);
const expo = new Expo({
  useFcmV1: false,
});

export type GraphQLContext = {
  prisma: PrismaClient;
  currentUser: null | User;
  twilioClient: TwilioSDK.Twilio;
  resend: Resend;
  expo: Expo;
};

export async function createContext(
  initialContext: YogaInitialContext
): Promise<GraphQLContext> {
  return {
    twilioClient,
    expo,
    prisma,
    resend,
    currentUser: await authenticateUser(prisma, initialContext.request),
  };
}
