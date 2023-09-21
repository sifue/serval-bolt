import {
  App,
  LogLevel,
  GenericMessageEvent,
  ReactionMessageItem,
} from '@slack/bolt';

const app = new App({
  logLevel: LogLevel.INFO, // デバッグするときには DEBUG に変更
  socketMode: true,
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
});

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function nowStr(): String {
  return new Date().toISOString();
}

// 動作確認用 ping コマンド
app.message(/^ping serval-bolt/, async ({ message, say }) => {
  const m = message as GenericMessageEvent;
  await say(`pong <@${m.user}>`);
});

// いいねいくつ
app.message(/^いいねいくつ/, async ({ message, say }) => {
  const m = message as GenericMessageEvent;
  const record = await prisma.goodcounts.findUnique({
    where: { userId: m.user },
  });
  const goodcount = record ? record.goodcount : 0;
  await say({
    text: `<@${m.user}>ちゃんのいいねは ${goodcount} こだよ！`,
    thread_ts: (message.subtype === undefined && message.thread_ts !== undefined) ? message.thread_ts : undefined
  });
});

// いいねの統計教えて
app.message(/^いいねの統計教えて/, async ({ message, say }) => {
  const m = message as GenericMessageEvent;
  const records = await prisma.goodreactions.findMany({
    where: { itemUserId: m.user },
  });

  const userMap = new Map<string, number>();
  const channelMap = new Map<string, number>();
  records.forEach((r: { reactionUserId: any; itemChannel: any; }) => {
    let userCount = userMap.get(r.reactionUserId) || 0;
    userMap.set(r.reactionUserId, userCount + 1);

    let channelCount = channelMap.get(r.itemChannel) || 0;
    channelMap.set(r.itemChannel, channelCount + 1);
  });

  const users = Array.from(userMap).sort((a, b) => {
    return b[1] - a[1];
  });

  const channels = Array.from(channelMap).sort((a, b) => {
    return b[1] - a[1];
  });

  let text = '';
  text += `<@${m.user}>ちゃんの統計を取ったいいねは ${records.length} こで、\n`;
  text += `\n:smiley:*いいねしてくれた人 (${users.length}名)*:smiley: \n`;
  users.forEach((u) => {
    text += `<@${u[0]}> ${u[1]}回\n`;
  });
  text += `\n:star:*いいねされたチャンネル (${channels.length}個)*:star: \n`;
  channels.forEach((c) => {
    text += `<#${c[0]}> ${c[1]}回\n`;
  });
  text += '\nこんなふうになってるよ〜。';

  // 自分だけに見えるチャットとして投稿
  await app.client.chat.postEphemeral({
    channel: message.channel,
    text,
    user: m.user,
  });
  await say(`<@${m.user}>ちゃんにだけ表示されるメッセージで送ったよ〜。`);
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

  if (event.reaction.indexOf('+1') == -1) return; // いいね以外を除外
  if (itemUserId === reactionUserId) return; // セルフいいねを除外
  if (!itemUserId) return; // itemUserIdが空であるパターンを除外

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

  // 記念メッセージ
  if (goodcount === 10 || goodcount === 50 || goodcount % 100 === 0) {
    await client.chat.postMessage({
      channel: i.channel,
      text: `<@${itemUserId}>ちゃん、すごーい！記念すべき ${goodcount} 回目のいいねだよ！おめでとー！`,
    });
  }

  console.log(
    `[${nowStr()}][INFO] Add Goodreaction goodcount: ${goodcount} itemUserId: ${itemUserId} reactionUserId: ${reactionUserId} eventTs: ${eventTs}`
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
  if (itemUserId === reactionUserId) return; // セルフいいねを除外

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
    `[${nowStr()}][INFO] Remove Goodreaction goodcount: ${goodcount} itemUserId: ${itemUserId} reactionUserId: ${reactionUserId} eventTs: ${eventTs}`
  );
});

// 入退出メッセージ機能
import * as fs from 'fs';
const joinMessagesFileName = './join_messages.json';
const leftMessagesFileName = './left_messages.json';
let joinMessages = new Map(); // key: チャンネルID, value: 入室メッセージ
let leftMessages = new Map(); // key: チャンネルID, value: 退出メッセージ

function saveJoinMessages() {
  fs.writeFileSync(
    joinMessagesFileName,
    JSON.stringify(Array.from(joinMessages)),
    'utf8'
  );
}

function saveLeftMessages() {
  fs.writeFileSync(
    leftMessagesFileName,
    JSON.stringify(Array.from(leftMessages)),
    'utf8'
  );
}

function loadChannelEventMessages() {
  try {
    const data = fs.readFileSync(joinMessagesFileName, 'utf8');
    joinMessages = new Map(JSON.parse(data));
  } catch (e) {
    console.log(`[${nowStr()}][INFO] loadJoinMessages Error:`);
    console.log(e);
    console.log(`[${nowStr()}][INFO] Use empty loadJoinMessages.`);
  }
  try {
    const data = fs.readFileSync(leftMessagesFileName, 'utf8');
    leftMessages = new Map(JSON.parse(data));
  } catch (e) {
    console.log(`[${nowStr()}][INFO] loadLeftMessages Error:`);
    console.log(e);
    console.log(`[${nowStr()}][INFO] Use empty loadLeftMessages.`);
  }
}

// 発言したチャンネルに入室メッセージを設定する
app.message(/^入室メッセージを登録して (.*)/i, async ({ message, say }) => {
  const m = message as GenericMessageEvent;
  const parsed = m.text?.match(/^入室メッセージを登録して (.*)/);
  if (parsed) {
    const joinMessage = parsed[1];
    joinMessages.set(m.channel, joinMessage);
    saveJoinMessages();
    await say(`入室メッセージ:「${joinMessage}」を登録したよ。`);
  }
});

// 発言したチャンネルの入室メッセージの設定を解除する
app.message(/^入室メッセージを消して/i, async ({ message, say }) => {
  const m = message as GenericMessageEvent;
  joinMessages.delete(m.channel);
  saveJoinMessages();
  await say(`入室メッセージを削除したよ。`);
});

// 発言したチャンネルの入室メッセージの設定を確認する
app.message(/^入室メッセージを見せて/i, async ({ message, say }) => {
  const m = message as GenericMessageEvent;
  const value = joinMessages.get(m.channel);
  if (value) {
    const message = value.replace(/\\n/g, '\n');
    await say(`現在登録されている入室メッセージは\n\n${message}\n\nだよ。`);
  }
});

// 発言したチャンネルに入室メッセージを設定する
app.message(/^退出メッセージを登録して (.*)/i, async ({ message, say }) => {
  const m = message as GenericMessageEvent;
  const parsed = m.text?.match(/^退出メッセージを登録して (.*)/);
  if (parsed) {
    const leftMessage = parsed[1];
    leftMessages.set(m.channel, leftMessage);
    saveLeftMessages();
    await say(`退出メッセージ:「${leftMessage}」を登録したよ。`);
  }
});

// 発言したチャンネルの入室メッセージの設定を解除する
app.message(/^退出メッセージを消して/i, async ({ message, say }) => {
  const m = message as GenericMessageEvent;
  leftMessages.delete(m.channel);
  saveLeftMessages();
  await say(`退出メッセージを削除したよ。`);
});

// 発言したチャンネルの入室メッセージの設定を確認する
app.message(/^退出メッセージを見せて/i, async ({ message, say }) => {
  const m = message as GenericMessageEvent;
  const value = leftMessages.get(m.channel);
  if (value) {
    const message = value.replace(/\\n/g, '\n');
    await say(`現在登録されている退出メッセージは\n\n${message}\n\nだよ。`);
  }
});

// 部屋に入ったユーザーへの入室メッセージを案内 %USERNAME% はユーザー名に、%ROOMNAME% は部屋名に、\\n は改行コード(\n)に置換
app.event('member_joined_channel', async ({ event, client }) => {
  const value = joinMessages.get(event.channel);
  if (value) {
    const message = value
      .replace('%USERNAME%', `<@${event.user}>`)
      .replace('%ROOMNAME%', `<#${event.channel}>`)
      .replace(/\\n/g, '\n');
    await client.chat.postMessage({ channel: event.channel, text: message });
  }
});

// 部屋から退出したユーザーの退出メッセージを案内 %USERNAME% はユーザー名に、%ROOMNAME% は部屋名に、\\n は改行コード(\n)に置換
app.event('member_left_channel', async ({ event, client }) => {
  const value = leftMessages.get(event.channel);
  if (value) {
    const message = value
      .replace('%USERNAME%', `<@${event.user}>`)
      .replace('%ROOMNAME%', `<#${event.channel}>`)
      .replace(/\\n/g, '\n');
    await client.chat.postMessage({ channel: event.channel, text: message });
  }
});

(async () => {
  await app.start();
  console.log(`[${nowStr()}][INFO] ⚡️ Bolt app started`);

  loadChannelEventMessages();
})();
