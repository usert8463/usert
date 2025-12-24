FROM node:20-bullseye-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /ovl_bot

COPY package.json .
RUN npm install

COPY . .

EXPOSE 8000

CMD ["npm","start"]
