import Expo, { ExpoPushMessage } from 'expo-server-sdk';

// export default async function sendNotifications(
//   expo: Expo,
//   messages: ExpoPushMessage[]
// ): Promise<void> {
//   const chunks = expo.chunkPushNotifications(messages);
//   const tickets = [];
//   for (const chunk of chunks) {
//     try {
//       const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
//       tickets.push(...ticketChunk);
//     } catch (error) {
//       console.error(error);
//     }
//   }
//   const receiptIds = [];
//   for (const ticket of tickets) {
//     if (ticket?.id) {
//       receiptIds.push(ticket?.id);
//     }
//   }
//   const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
//   for (const chunk of receiptIdChunks) {
//     try {
//       const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
//       console.log(receipts);
//     } catch (error) {
//       console.error(error);
//     }
//   }
// }

export async function answerQuestionNotification({
  expo,
  userAnswerId,
  userExpoPushToken,
}: {
  expo: Expo;
  userAnswerId: string;
  userExpoPushToken: string | null;
}) {
  // Get the user answer
  if (Expo.isExpoPushToken(userExpoPushToken)) {
    const message = {
      to: userExpoPushToken,
      title: 'A friend answered you!',
      body: "You were answered for today's question. Check it out now!",
      data: { userAnswerId },
    };

    const tickets = await expo.sendPushNotificationsAsync([message]);

    for (const ticket of tickets) {
      if (ticket.status === 'ok') {
        console.log('Notification sent successfully');
      }
    }
  }
}
export function newQuestionNotifications({
  questionId,
}: {
  questionId: string;
}) {}
