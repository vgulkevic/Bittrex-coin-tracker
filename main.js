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
    console.log(message);
    const url = `https://api.telegram.org/bot${botKey}/sendMessage`;
    axiosInstance.post(url, {
        chat_id: chatId,
        text: message,
        parse_mode: "HTML"
    }).catch((error) => {
        sendNotification("Error sending notification");
        console.log(error.response.data.description);

        let sanitizedErrorDescription = error.response.data.description;
        sanitizedErrorDescription = sanitizedErrorDescription.replace(/</g, "&lt;")
        sanitizedErrorDescription = sanitizedErrorDescription.replace(/>/g, "&gt;")
        sanitizedErrorDescription = sanitizedErrorDescription.replace(/&/g, "&amp;")
        sendNotification(sanitizedErrorDescription);
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
        console.log("not sending because of time");
        return;
    }

    const percentChange = parseFloat(market.percentChange);
    const currentQuoteVolume = parseFloat(market.quoteVolume);
    if (Math.abs(percentChange - percentageChangeAtLastUpdate) > 10 || compareQuoteVolumeChange(currentQuoteVolume)) {
        buildMessageForMarketUpdate(market, percentChange, currentQuoteVolume);

        percentageChangeAtLastUpdate = percentChange;
        quoteVolume = currentQuoteVolume;
        lastMessageSentAt = new Date();
    }
}

function compareQuoteVolumeChange(currentQuoteVolume) {
    if (currentQuoteVolume < quoteVolume) {
        console.log("quote volume is lowering");
        quoteVolume = currentQuoteVolume;
        return false;
    }

    if (currentQuoteVolume < 0.1) {
        console.log("currentQuoteVolume is too low");
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

    console.log("volume change: " + (currentQuoteVolume - quoteVolume) / quoteVolume);

    message += `<b>Market</b>: ${market.symbol}\n`;
    message += `<b>Volume</b>: ${market.quoteVolume}\n`;
    message += `<b>Volume change</b>: ${quoteVolume > 0 ? (roundNumberToDp(((currentQuoteVolume - quoteVolume) / quoteVolume) * 100, 2) ) + "%" : ("N/A")}\n`;
    message += `<b>Daily percent change</b>: ${percentChange}%`;

    sendNotification(message);
}

function roundNumberToDp(number, dp) {
    return Math.round((number + Number.EPSILON) * Math.pow(10, dp)) / Math.pow(10, dp)
}

client.start();
