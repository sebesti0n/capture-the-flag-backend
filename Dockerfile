FROM node:20-alpine

WORKDIR /usr/src/app

RUN npm install -g knex

COPY package*.json .

RUN npm i --production

COPY . .

EXPOSE 3000

CMD [ "sh", "-c", "npm run migrate && npm run start" ]