FROM node:8.9-alpine AS base
RUN npm config set registry http://registry.npm.taobao.org
ENV NODE_ENV production
WORKDIR /usr/src/wordgame
COPY ["package.json",  "./"]
RUN npm install --production

FROM node:8.9-alpine AS builder
RUN npm config set registry http://registry.npm.taobao.org
WORKDIR /usr/src/wordgame
COPY ["package.json", "./"]
RUN npm install 
COPY . .
RUN npm run build

FROM base
COPY --from=builder /usr/src/wordgame/build /usr/src/wordgame/build
COPY  ./keys ./keys
EXPOSE 443
VOLUME [ "/usr/src/wordgame/website/" ]
CMD npm start


