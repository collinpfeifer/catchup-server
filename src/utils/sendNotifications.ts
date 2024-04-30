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
export async function newQuestionsNotifications({
  expo,
  pushTokens,
}: {
  expo: Expo;
  pushTokens: string[];
}) {
  const message = {
    to: pushTokens,
    title: 'New Question of The Day!',
    body: 'Answer to see what your friends said about you!',
  };
  const chunks = expo.chunkPushNotifications([message]);
  const tickets = await expo.sendPushNotificationsAsync([message]);
  // Get all users
  // Get all users that have notifications enabled
  // Send notifications to all users
  // Update the user's last notification date
}

export async function newFriendRequestNotification({
  expo,
  userExpoPushToken,
}: {
  expo: Expo;
  userExpoPushToken: string | null | undefined;
}) {
  if (Expo.isExpoPushToken(userExpoPushToken)) {
    const message = {
      to: userExpoPushToken,
      title: 'New friend request!',
      body: 'You have a new friend request. Check it out now!',
    };

    const tickets = await expo.sendPushNotificationsAsync([message]);
    for (const ticket of tickets) {
      if (ticket.status === 'ok') {
        console.log('Notification sent successfully');
      }
    }
  }
}
