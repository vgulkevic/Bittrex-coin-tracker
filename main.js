const signalr = require('node-signalr')
const zlib = require('zlib');
const axios = require('axios')

const hubName = 'c3';
let client = new signalr.client('https://socket-v3.bittrex.com/signalr', [hubName])
const axiosInstance = axios.create({});

const marketToTrack = "XDN-BTC";

const botKey = "YOUR_TG_BOT_KEY";
const chatId = "YOUR_CHAT_ID"

client.on('connected', () => {
    console.log('SignalR client connected.')
    sendNotification("Starting to track the market");

    subscribeToMarketSummary(marketToTrack);
})
client.on('reconnecting', (count) => {
    console.log(`SignalR client reconnecting(${count}).`)
})
client.on('disconnected', (code) => {
    sendNotification(`SignalR client disconnected(${code}).`);
})
client.on('error', (code, ex) => {
    console.log(`SignalR client connect error: ${code}.`)
    sendNotification(`Error when connecting to SignalR. Error: ${code}`);
})

client.connection.hub.on(hubName, 'marketsummary', (message) => {
    onMarketSummary(messageDecoder(message));
})

const messageDecoder = (encodedMessage) => {
    const msgBuf = Buffer.from(encodedMessage, 'base64');
    const res = zlib.inflateRawSync(msgBuf);
    return res.toString('utf8');
}

const subscribeToMarketSummary = (market) => {
    subscribe([`market_summary_${market}`]);
}

const subscribe = (message) => {
    console.log(message);
    client.connection.hub.call(hubName, 'Subscribe', message).then((result) => {
        console.log('success:', result)

        if (result[0].ErrorCode) {
            sendNotification(`Error when subscribing. ErrorCode: ${result[0].ErrorCode}`);
        }
    }).catch((error) => {
        console.log('error:', error)
    })
}

const sendNotification = (message) => {
    console.log(`Sending notification: {${message}}`);

    const url = `https://api.telegram.org/bot${botKey}/sendMessage`;
    axiosInstance.post(url, {
        chat_id: chatId,
        text: (message + "").replace(/\./g, "\\."),
        parse_mode: "MarkdownV2"
    }).catch((error) => {
        sendNotification("Error sending notification");
        console.log(error);
    }).then((res) => {
        console.log(res);
    })
};


let lastMessageSentAt = null;
let percentageChangeAtLastUpdate = 0;
let quoteVolume = 0;
const onMarketSummary = (message) => {
    console.log(message);

    const market = JSON.parse(message);

    const timeOfTheMessage = new Date(market.updatedAt);

    if (lastMessageSentAt && timeOfTheMessage.getTime() - lastMessageSentAt.getTime() < minutesInTime(10)) {
        return;
    }

    const percentChangeAbs = Math.abs(parseFloat(market.percentChange));
    const percentChange = parseFloat(market.percentChange);
    const currentQuoteVolume = parseFloat(market.quoteVolume);
    if (percentChangeAbs - Math.abs(percentageChangeAtLastUpdate) > 10 || compareQuoteVolumeChange(currentQuoteVolume)) {
        buildMessageForMarketUpdate(market, percentChange, currentQuoteVolume);

        percentageChangeAtLastUpdate = percentChange;
        quoteVolume = currentQuoteVolume;
        lastMessageSentAt = new Date();
    }
}

function compareQuoteVolumeChange(currentQuoteVolume) {
    if (currentQuoteVolume < quoteVolume) {
        quoteVolume = currentQuoteVolume;
        return false;
    }

    if (currentQuoteVolume < 0.1) {
        return false;
    } else if (quoteVolume === 0) {
        return true;
    }

    // 5 percent increase in volume
    if (((currentQuoteVolume - quoteVolume) / quoteVolume) > 0.05) {
        return true;
    }
}

function minutesInTime(minutes) {
    return minutes * 60000;
}

function buildMessageForMarketUpdate(market, percentChange, currentQuoteVolume) {
    let message = "";
    let escapedSymbol = market.symbol.replace(/-/g, "\\-");

    message += `*Market*: ${escapedSymbol}\n`;
    message += `*Volume*: ${market.quoteVolume}\n`;
    message += `*Volume change*: ${percentageChangeAtLastUpdate > 0 ? ((currentQuoteVolume - quoteVolume) / quoteVolume) : ("N/A")}\n`;
    message += `*Percent change*: ${percentChange}`;

    sendNotification(message);
}


client.start();
