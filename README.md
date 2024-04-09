# サーバル bot (Bolt 版)

いいね :+1: の数をカウントする Slack のボット
[Bolt for JavaScript](https://github.com/slackapi/bolt-js) を利用

# 機能

## いいね

:+1: の数(厳密には `+1` を含むリアクション肌の色バリエーションなど)をカウントします。<br>
特定の数になると本人を褒めるメッセージを送信します。

|コマンド|説明|補足|
|-|-|-|
|いいねいくつ|自身のいいねの数を教えてくれます。||
|いいねの統計教えて|いいねしてくれた人といいねされたチャンネルを一覧表示します。|コマンド実行者のみに表示されます。|

## 入室・退出メッセージ

チャンネルへの入室時や退出時にメッセージを送信する機能です。

> [!WARNING]
> この機能のコマンドに含まれるスペースはすべて半角です。<br>
> 全角だと反応しません。

|コマンド|説明|補足|
|-|-|-|
|入室メッセージを登録して (文章)|そのチャンネルの入室メッセージを登録します。|`%USERNAME%` と `%ROOMNAME%` が使用できます。|
|入室メッセージを消して|そのチャンネルの入室メッセージを消去します。||
|入室メッセージを見せて|そのチャンネルの入室メッセージを表示します。||
|退出メッセージを登録して (文章)|そのチャンネルの退出メッセージを登録します。|`%USERNAME%` と `%ROOMNAME%` が使用できます。|
|退出メッセージを消して|そのチャンネルの退出メッセージを消去します。||
|退出メッセージを見せて|そのチャンネルの退出メッセージを表示します。||

### 入室メッセージ登録時のコマンド実行例

```
%USERNAME% さん、いらっしゃい！
ここは %ROOMNAME% です！
```
上記のメッセージを登録する場合は、以下のようにします。
```
入室メッセージを登録して %USERNAME% さん、いらっしゃい！
ここは %ROOMNAME% です！
```
退出メッセージの登録も同じように行えます。

### エイリアス

上記のコマンドの一部にはエイリアスが設定されおり、代わりにそのコマンドを使用できます。<br>
以下はその一覧です。
|コマンド|エイリアス|
|-|-|
|入室メッセージを登録して|参加メッセージを登録して|
|入室メッセージを見せて|参加メッセージを見せて|
|入室メッセージを消して|参加メッセージを消して|
|退出メッセージを登録して|退室メッセージを登録して|
|退出メッセージを見せて|退室メッセージを見せて|
|退出メッセージを消して|退室メッセージを消して|

例えば、 `入室メッセージを見せて` は `参加メッセージを見せて` でも代用できます。

### %USERNAME%や%ROOMNAME%について

`%USERNAME%` はユーザーメンションに、 `%ROOMNAME%` はチャンネルメンションに置き換わります。<br>
例えば、以下の文章を入室メッセージに登録していたとします。
```
%USERNAME% さん、いらっしゃい！
ここは %ROOMNAME% です！
```
この状態で、 `あ` という名前の人が `programming` という名前のチャンネルに参加した場合、以下のようになります。
```
@あ さん、いらっしゃい！
ここは #programming です！
```

# 動作確認環境

- docker + compose プラグイン(開発環境としてはこちらを推奨)

Docker での動作方法は以下に記載。もしくは

- Node.js v14.17.2
- TypeScript Version 4.3.5
- PostgreSQL 12.7

こちらでも実行可能必要なコマンドは `Dockerfile` などを見て構築方法を確認のこと。長期運用するならば Docker を利用しない方がパフォーマンスが安定している。

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
- member_left_channel (退出メッセージ機能)

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

# Docker での実行環境 の設定

`.env` ファイルに以下を記載、作製した Slack のトークンと PostgreSQL のポートなどのプロパティを設定。`_env`ファイルをコピーして作成。

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

`join_messages.json` ファイルと`left_messages.json` ファイルを用意。このファイルは入室メッセージと退出メッセージを永続化する。

```
[]
```

中身は空配列の文字列だけで OK。

## 起動

```
docker compose up -d --build
```

注意！ローカルで起動した際には Docker の起動と競合してしまうので、Docker でその後起動したい場合には `dist` と `node_modules` フォルダを削除してからビルドしなおすこと！

## 起動確認

```
docker compose ps
```

## ログ確認

```
docker compose logs
```

## 終了

```
docker compose down
```

## アプリ側の Linux の動作確認

```
docker compose exec app /bin/sh
```

## DB 側の Linux の動作確認

```
docker compose exec db /bin/sh
```

## アプリだけ停止 (DB の更新のために利用)

```
docker compose rm -fsv app
```

## DB のバックアップ (要 PostgreSQL Clinet)

```
env PGPASSWORD=passw0rd pg_dump -h 127.0.0.1 -p 5432 -U postgres serval_bolt > serval_bolt_backup
```

## DB のリストア (要 PostgreSQL Clinet)

```
env PGPASSWORD=passw0rd psql -h 127.0.0.1 -p 5432 -U postgres -f serval_bolt_backup serval_bolt
```

# Node.js と PostgreSQL での実行環境の設定

`.env` ファイルに以下を記載、作製した Slack のトークンと PostgreSQL のポートなどのプロパティを設定。`_env`ファイルをコピーして作成。

```
# Environment variables declared in this file are automatically made available to Prisma.
# See the documentation for more detail: https://pris.ly/d/prisma-schema#using-environment-variables

# Prisma supports the native connection string format for PostgreSQL, MySQL, SQL Server and SQLite.
# See the documentation for all the connection string options: https://pris.ly/d/connection-strings

DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/serval_bolt?schema=public"
```

`join_messages.json` ファイルを用意。このファイルは入室メッセージを永続化する。

```
[]
```

中身は空配列の文字列だけで OK。

## 起動

```
npm i
npx prisma generate
npx run build
npx prisma db push
env SLACK_BOT_TOKEN=xoxb-xxxx-xxxxx SLACK_APP_TOKEN=xapp-1-xxxxxx-xxxxx node dist/index.js
```

Slack のトークンは起動引数に入れて実行。長期運用する際には[forever](https://www.npmjs.com/package/forever)などを使ってプロセスが自動的に再起動、したりログ収集したりするようにすると良い。

# 参考: Bolt のリファレンス

[https://slack.dev/bolt-js/ja-jp/reference](https://slack.dev/bolt-js/ja-jp/reference)
