# サーバル bot (Bolt 版)

いいね :+1: の数をカウントする Slack のボット
[Bolt for JavaScript](https://github.com/slackapi/bolt-js) を利用

## 機能

- いいね :+1: の数(厳密には+1 を含むリアクション肌の色バリエーションなど)をカウントしてくれる
- 特定の数になると本人を褒めてくれる
- 「いいねいくつ」と聞くと自身のいいねの数を教えてくれる
- 「いいねの統計教えて」と聞くといいねくれた人といいねされたチャンネルを教えてくれる (メンションが飛ぶので注意)
- 「入室メッセージを登録して %USERNAME%さんいらっしゃい。ここは%ROOMNAME%です。」のように発言すると「%USERNAME%さんいらっしゃい。ここは%ROOMNAME%です。」をそのチャンネルの入室メッセージとして登録する。改行するには「\n」を改行したい場所に差し込む。
  入室メッセージの %USERNAME% は表示名またはユーザー名に、 %ROOMNAME% は #programming のようなチャンネル名に置換される。
- 「入室メッセージを消して」のように発言すると、そのチャンネルの入室メッセージを解除する
- 「入室メッセージを見せて」のように発言すると、そのチャンネルの入室メッセージを表示する

# 動作確認環境
- docker + composeプラグイン(こちらを推奨)

Dockerでの動作方法は以下に記載。もしくは

- Node.js v14.17.2
- TypeScript Version 4.3.5
- PostgreSQL 12.7

こちらでも実行可能必要なコマンドは `Dockerfile` などを見て構築方法を確認のこと。

# Slack アプリケーションの作成方法

[https://qiita.com/seratch/items/1a460c08c3e245b56441](https://qiita.com/seratch/items/1a460c08c3e245b56441)
以上を参考に、WebSocket モードでアプリケーションを作成

## Event Subscription の設定

- message.channels
- message.groups
- message.im
- message.mpim
- reaction_added (いいねのカウント機能)
- reaction_removed (いいねカウントの削除機能)
- member_joined_channel (入室メッセージ機能)
- member_left_channel (退出メッセージ機能の予定)

## Bot Token Scope の設定

- channels:history
- channels:read
- chat:write
- commands
- groups:history
- groups:read
- im:history
- mpim:history
- reactions:read


# 実行環境 の設定

`.env` ファイルに以下を記載、作製したSlackのトークンとPostgreSQLのポートなどのプロパティを設定。`_env`ファイルをコピーして作成。

```
SLACK_BOT_TOKEN=xoxb-xxxxxxx-xxxxxxx-xxxxxxx-xxxxxxx
SLACK_APP_TOKEN=xapp-1-xxxxxxx-xxxxxxx-xxxxxxx-xxxxxxx

# Environment variables declared in this file are automatically made available to Prisma.
# See the documentation for more detail: https://pris.ly/d/prisma-schema#using-environment-variables

# Prisma supports the native connection string format for PostgreSQL, MySQL, SQL Server and SQLite.
# See the documentation for all the connection string options: https://pris.ly/d/connection-strings

NAME_SUFFIX=
POSTGRES_PORT=5432
DATABASE_URL="postgresql://postgres:passw0rd@serval-bolt-db:5432/serval_bolt?schema=public" 
```

`join_messages.json` ファイルを用意。このファイルは入室メッセージを永続化する。

```
[]
```

中身は空配列の文字列だけでOK。

# 起動
```
docker compose up -d --build
```

注意！ローカルで起動した際にはDockerの起動と競合してしまうので、Dockerでその後起動したい場合には `dist` と `node_modules` フォルダを削除してからビルドしなおすこと！

# 起動確認
```
docker compose ps
```

# ログ確認
```
docker compose logs
```

# 終了
```
docker compose down
```

# アプリ側のLinuxの動作確認
```
docker compose exec app /bin/sh
```

# DB側のLinuxの動作確認
```
docker compose exec db /bin/sh
```

# アプリだけ停止 (DBの更新のために利用)
```
docker compose rm -fsv app
```

# DBのバックアップ (要PostgreSQL Clinet)
```
pg_dump -h 127.0.0.1 -p 5432 -U postgres serval_bolt > serval_bolt_backup
```

# DBのリストア  (要PostgreSQL Clinet)

```
psql -h 127.0.0.1 -p 5432 -U postgres -f serval_bolt_backup serval_bolt
```


# 参考: Bolt のリファレンス

[https://slack.dev/bolt-js/ja-jp/reference](https://slack.dev/bolt-js/ja-jp/reference)
