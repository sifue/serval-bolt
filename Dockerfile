# 参考
# https://nodejs.org/ja/docs/guides/nodejs-docker-webapp/
# https://zenn.dev/dove/articles/d02f66cc0aa5c3
FROM node:24-alpine

ENV LANG=ja_JP.UTF-8
ENV HOME=/home/node
ENV APP_HOME="$HOME/serval-bolt"

# アプリケーションディレクトリを作成する
WORKDIR $APP_HOME

# EXPOSE 3000

# global install curlはローカルで簡単にAPIチェックできるように入れた。
# gitはjestのwatchモードに必要
# postgresql-clientはDBでpostgres使ってるなら必要
RUN apk upgrade --no-cache && \
    apk add --update --no-cache \
    postgresql-client curl git

# https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md#global-npm-dependencies
# npmのグローバル設定
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin

# アプリケーションの依存関係をインストールする
# ワイルドカードを使用して、package.json と package-lock.json の両方が確実にコピーされるようにします。
# 可能であれば (npm@5+)
COPY --chown=node:node package*.json ./

USER node

RUN echo "WORKDIR is $WORKDIR . HOME is $HOME . LANG is $LANG ." && npm config list

# キャッシュを利用して依存関係をインストールする
RUN --mount=type=cache,uid=1000,target=/home/node/.npm \
    npm ci

# アプリケーションのソースをバンドルする
# USER node 以降でもビルドできるように所有者を明示する
COPY --chown=node:node . .

RUN npx prisma generate

# CMD ["sleep", "infinity"]
CMD ["/bin/sh", "startup.sh"]