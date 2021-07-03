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

// グローバルショートカット
app.shortcut('socket-mode-shortcut', async ({ ack, body, client }) => {
  await ack();
  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: 'modal',
      callback_id: 'modal-id',
      title: {
        type: 'plain_text',
        text: 'タスク登録',
      },
      submit: {
        type: 'plain_text',
        text: '送信',
      },
      close: {
        type: 'plain_text',
        text: 'キャンセル',
      },
      blocks: [
        {
          type: 'input',
          block_id: 'input-task',
          element: {
            type: 'plain_text_input',
            action_id: 'input',
            multiline: true,
            placeholder: {
              type: 'plain_text',
              text: 'タスクの詳細・期限などを書いてください',
            },
          },
          label: {
            type: 'plain_text',
            text: 'タスク',
          },
        },
      ],
    },
  });
});

app.view('modal-id', async ({ ack, view, logger }) => {
  console.log(view.state.values);
  logger.info(`Submitted data: ${view.state.values}`);
  await ack();
});

// イベント API
app.message('こんにちは', async ({ message, say }) => {
  const m = message as GenericMessageEvent;
  await say(`:wave: こんにちは <@${m.user}>！`);
});

app.message('いいねいくつ', async ({ message, say }) => {
  const m = message as GenericMessageEvent;
  const record = await prisma.goodcounts.findUnique({
    where: { userId: m.user },
  });
  const goodcount = record ? record.goodcount : 0;
  await say(`<@${m.user}>ちゃんのいいねは ${goodcount} こだよ！`);
});

// リアクションに対する対応
app.event('reaction_added', async ({ event, client }) => {
  const i = event.item as ReactionMessageItem;
  const itemUserId = event.item_user;
  const reactionUserId = event.user;
  const itemChannel = i.channel;
  const itmeType = i.type;
  const itemTs = i.ts;
  const eventTs = event.event_ts;

  // DBへの保存
  const record = await prisma.goodcounts.findUnique({
    where: { userId: event.item_user },
  });
  const goodcount = record ? record.goodcount + 1 : 1;
  await prisma.goodcounts.create({ data: { userId: itemUserId, goodcount } });
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

  // レスポンス
  await client.chat.postMessage({
    channel: i.channel,
    text: `:wave: リアクションありがとう reaction: :${event.reaction}: user: ${event.user} item_user: ${event.item_user} event_ts: ${event.event_ts}`,
  });
});

(async () => {
  await app.start();
  console.log('⚡️ Bolt app started');
})();
