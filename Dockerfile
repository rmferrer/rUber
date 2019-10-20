#---------- BASE -----------
FROM node:10 AS ruber-base

# Install dependencies

# xvfb (https://github.com/nsourov/Puppeteer-with-xvfb)
RUN apt-get update &&\
apt-get install -yq gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 \
libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 \
libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 \
libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 \
ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget \
xvfb x11vnc x11-xkb-utils xfonts-100dpi xfonts-75dpi xfonts-scalable xfonts-cyrillic x11-apps

# chrome (https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#running-puppeteer-in-docker)
# Install latest chrome dev package and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, Thai and a few others)
# Note: this installs the necessary libs to make the bundled version of Chromium that Puppeteer
# installs, work.
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-unstable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst ttf-freefont \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Creating Display
ENV DISPLAY :99

#---------- TEST -----------
FROM ruber-base AS ruber-test

WORKDIR /app

# Install node modules
COPY package.json /app
RUN npm install

COPY . /app

CMD bash scripts/display.sh & npm test

#---------- LOCAL -----------
FROM ruber-base AS ruber-local

# Cd into /app
WORKDIR /app

# Copy package.json into app folder
COPY package.json /app
RUN npm install

COPY . /app

# Start server on port 3000
EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=development

# Start script on Xvfb
CMD bash scripts/display.sh & npm run start-dev

#---------- HEROKU -----------
FROM ruber-base AS ruber-heroku

RUN apt-get update && apt-get -y install curl bash openssh-server openssh-client python
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

# Cd into /app
WORKDIR /app

# Copy package.json into app folder
COPY package.json /app
RUN npm install --only=prod

COPY . /app
ADD ./heroku/.profile.d /app/.profile.d

# Start server on port 3000
EXPOSE 3000
ENV PORT=3000

# Start script on Xvfb
CMD bash /app/.profile.d/heroku-exec.sh & bash scripts/display.sh & npm run start
