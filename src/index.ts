import {
  App,
  LogLevel,
  GenericMessageEvent,
  ReactionMessageItem,
} from '@slack/bolt';

const app = new App({
  logLevel: LogLevel.DEBUG,
  socketMode: true,
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
});

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 動作確認用 ping コマンド
app.message('ping serval-bolt', async ({ message, say }) => {
  const m = message as GenericMessageEvent;
  await say(`pong <@${m.user}>`);
});

// いいねいくつ
app.message('いいねいくつ', async ({ message, say }) => {
  const m = message as GenericMessageEvent;
  const record = await prisma.goodcounts.findUnique({
    where: { userId: m.user },
  });
  const goodcount = record ? record.goodcount : 0;
  await say(`<@${m.user}>ちゃんのいいねは ${goodcount} こだよ！`);
});

// リアクション追加に対する対応
app.event('reaction_added', async ({ event, client }) => {
  const i = event.item as ReactionMessageItem;
  const itemUserId = event.item_user;
  const reactionUserId = event.user;
  const itemChannel = i.channel;
  const itmeType = i.type;
  const itemTs = i.ts;
  const eventTs = event.event_ts;

  if (event.reaction !== '+1') return; // いいね以外を除外
  // if (itemUserId === reactionUserId) return; // セルフいいねを除外 // TODO 戻す

  // Goodreactionsへの保存
  await prisma.goodreactions.create({
    data: {
      itemUserId,
      reactionUserId,
      itemChannel,
      itmeType,
      itemTs,
      eventTs,
    },
  });

  // Goodcountsのインクリメント
  const record = await prisma.goodcounts.findUnique({
    where: { userId: event.item_user },
  });
  const goodcount = record ? record.goodcount + 1 : 1;
  if (record) {
    await prisma.goodcounts.update({
      where: { userId: itemUserId },
      data: { goodcount },
    });
  } else {
    await prisma.goodcounts.create({ data: { userId: itemUserId, goodcount } });
  }

  console.log(
    `[INFO] Add Goodreaction goodcount: ${goodcount} itemUserId: ${itemUserId} reactionUserId: ${reactionUserId} eventTs: ${eventTs}`
  );
});

// リアクション削除に対する対応
app.event('reaction_removed', async ({ event, client }) => {
  const i = event.item as ReactionMessageItem;
  const itemUserId = event.item_user;
  const reactionUserId = event.user;
  const itemChannel = i.channel;
  const itmeType = i.type;
  const itemTs = i.ts;
  const eventTs = event.event_ts;

  if (event.reaction !== '+1') return; // いいね以外を除外
  // if (itemUserId === reactionUserId) return; // セルフいいねを除外 // TODO 戻す

  // Goodreactionsの削除
  await prisma.goodreactions.deleteMany({
    where: {
      itemUserId,
      reactionUserId,
      itemChannel,
      itmeType,
      itemTs,
    },
  });

  // Goodcountsのデクリメント
  const record = await prisma.goodcounts.findUnique({
    where: { userId: event.item_user },
  });
  const goodcount = record && record.goodcount > 0 ? record.goodcount - 1 : 0;
  if (record) {
    await prisma.goodcounts.update({
      where: { userId: itemUserId },
      data: { goodcount },
    });
  } else {
    await prisma.goodcounts.create({ data: { userId: itemUserId, goodcount } });
  }

  console.log(
    `[INFO] Remove Goodreaction goodcount: ${goodcount} itemUserId: ${itemUserId} reactionUserId: ${reactionUserId} eventTs: ${eventTs}`
  );
});

(async () => {
  await app.start();
  console.log('[INFO] ⚡️ Bolt app started');
})();
