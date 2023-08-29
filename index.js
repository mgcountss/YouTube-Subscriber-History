import fetch from 'node-fetch';
import fs from 'fs/promises';
import jsdom from 'jsdom';
let data = await getData();
let currentEvents = [];
data = JSON.parse(data);

const config = JSON.parse(await fs.readFile('config.json', 'utf8'))
data[config.joined] = "0";

async function getSubscribers(url, date, timestamp, eid) {
    url = 'https://web.archive.org/web/' + timestamp + '/' + url;
    console.log(url)
    let body;
    const res = await fetch(url);
    try {
        body = await res.text();
    } catch (e) {
        console.error(e);
        return eid;
    }
    let subscribers = "";
    const ytInitialDataMatch = body.match(/var ytInitialData = (.*?);<\/script>/);
    try {
        if (ytInitialDataMatch) {
            const ytInitialData = JSON.parse(ytInitialDataMatch[1]);
            subscribers = ytInitialData.header.c4TabbedHeaderRenderer.subscriberCountText.simpleText;
        } else {
            const dom = new jsdom.JSDOM(body);
            if (dom.window.document.querySelector("#c4-primary-header-contents > div > div > div:nth-child(2) > div > span > span.yt-subscription-button-subscriber-count-branded-horizontal.subscribed.yt-uix-tooltip")) {
                subscribers = dom.window.document.querySelector("#c4-primary-header-contents > div > div > div:nth-child(2) > div > span > span.yt-subscription-button-subscriber-count-branded-horizontal.subscribed.yt-uix-tooltip").textContent;
                subscribers = subscribers.replace(/,/g, '');
            } else if (dom.window.document.querySelector("yt-subscription-button-subscriber-count-branded-horizontal subscribed yt-uix-tooltip")) {
                subscribers = dom.window.document.querySelector("yt-subscription-button-subscriber-count-branded-horizontal subscribed yt-uix-tooltip").textContent;
                subscribers = subscribers.replace(/,/g, '');
            } else if (dom.window.document.querySelector('.yt-subscription-button-subscriber-count-branded-horizontal')) {
                subscribers = dom.window.document.querySelector('.yt-subscription-button-subscriber-count-branded-horizontal').textContent;
                subscribers = subscribers.replace(/,/g, '');
            } else if (dom.window.document.querySelector('.subscribed')) {
                subscribers = dom.window.document.querySelector('.subscribed').textContent;
                subscribers = subscribers.replace(/,/g, '');
            } else if (dom.window.document.querySelector('#subscriber-count')) {
                subscribers = dom.window.document.querySelector('#subscriber-count').textContent;
                subscribers = subscribers.replace(/,/g, '');
            } else if (dom.window.document.querySelector('#profile_show_subscriber_count')) {
                subscribers = dom.window.document.querySelector('#profile_show_subscriber_count').textContent;
                subscribers = subscribers.replace(/,/g, '');
            } else if (dom.window.document.querySelector("#channel-header-main > div.upper-section.ytg-box > div.upper-right-section > div > div:nth-child(1) > span.stat-value")) {
                subscribers = dom.window.document.querySelector("#channel-header-main > div.upper-section.ytg-box > div.upper-right-section > div > div:nth-child(1) > span.stat-value").textContent;
                subscribers = subscribers.replace(/,/g, '');
            } else if (dom.window.document.querySelector("#channel-header-main > div.upper-section.clearfix > div.upper-right-section > div > div:nth-child(1) > span.stat-value")) {
                subscribers = dom.window.document.querySelector("#channel-header-main > div.upper-section.clearfix > div.upper-right-section > div > div:nth-child(1) > span.stat-value").textContent;
                subscribers = subscribers.replace(/,/g, '');
            }
        }
    } catch (e) {
        console.error(e);
        return eid;
    }
    if (subscribers == "") {
        console.log("No subscribers found for " + url + " on " + date + "... at: " + url);
        data[date] = "null";
        fs.writeFile('./fails/body_' + date + '.html', body);
        return eid;
    } else {
        data[date] = subscribers;
        return eid;
    }
}

async function getWebArchivesFromURL(url) {
    try {
        const res = await fetch('http://web.archive.org/cdx/search/cdx?url=' + url + '&output=json&fl=timestamp,original&filter=statuscode:200');
        let body = await res.json();
        let events = [];
        for (let i = 1; i < body.length; i++) {
            const date = body[i][0].slice(0, 4) + '-' + body[i][0].slice(4, 6) + '-' + body[i][0].slice(6, 8);
            const timestamp = body[i][0];
            if (data[date]) continue;
            events.push([
                body[i][1],
                date,
                timestamp,
                "Unstarted",
                genRandomString(10)
            ])
        }
        setInterval(async () => {
            if (currentEvents.length < 5) {
                if (events.length == 0) return;
                currentEvents.push(events[0]);
                events.shift();
            }
            for (let i = 0; i < currentEvents.length; i++) {
                if (currentEvents[i][3] == "Unstarted") {
                    currentEvents[i][3] = "Started";
                    getSubscribers(currentEvents[i][0], currentEvents[i][1], currentEvents[i][2], currentEvents[i][4]).then((eid) => {
                        for (let i = 0; i < currentEvents.length; i++) {
                            if (currentEvents[i][4] == eid) {
                                currentEvents.splice(i, 1);
                                console.log(events.length)
                                fs.writeFile('data.json', JSON.stringify(data, "null", 2));
                                break;
                            }
                        }
                    });
                }
            }
        }, 100)
    } catch (e) {
        console.error(e);
    }
}

const genRandomString = (length) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._';
    const charactersLength = characters.length;
    for (let i = length; i > 0; i--) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

(async () => {
    if (!config.calculate) {
        if (config.data.tubealytics.enabled) {
            await tubealytics();
        }
        if (config.data.filmot.enabled) {
            await filmot();
        }
        if (config.data.youtubersDotMe.enabled) {
            await youtubersDotMe();
        }
        if (config.data.axernSpace.enabled) {
            await axernSpace();
        }
        if (config.data.speakrj.enabled) {
            await speakrj();
        }
        if (config.data.youtube.enabled) {
            for (const url of config.urls) {
                console.log('http://web.archive.org/cdx/search/cdx?url=' + url + '&output=json&fl=timestamp,original&filter=statuscode:200');
                await getWebArchivesFromURL(url);
            }
        }
    } else {
        let newData = {};
        let pureSortedData = {};
        Object.keys(data).sort().forEach((key) => {
            if (data[key] == "null") {
                delete data[key];
            } else {
                pureSortedData[key] = data[key];
            }
        });
        fs.writeFile('pureSortedData.json', JSON.stringify(pureSortedData, "null", 2));
        Object.keys(data).sort().forEach((key) => {
            if (data[key] == "null") {
                delete data[key];
            } else {
                data[key] = data[key].replace(' subscribers', '')
                data[key] = data[key].replace(' ', '')
                if (data[key].includes('K')) {
                    if (data[key].includes('.')) {
                        data[key] = data[key].replace('.', '')
                        data[key] = data[key].replace('K', '00')
                    } else {
                        data[key] = data[key].replace('K', '000')
                    }
                } else if (data[key].includes('M')) {
                    if (!data[key].includes('Mio')) {
                        if (data[key].includes('.')) {
                            data[key] = data[key].replace('.', '')
                            data[key] = data[key].replace('M', '00000')
                        } else {
                            data[key] = data[key].replace('M', '000000')
                        }
                    }
                }
                if (data[key].includes('Mio. Abonnenten')) {
                    data[key] = data[key].replace('Mio. Abonnenten', '000000')
                }
                data[key] = data[key].replace('.', '')
                data[key] = data[key].replace(' ', '')
                newData[key] = data[key];
            }
        });
        const joinedDate = new Date(config.joined);
        const today = new Date();
        while (joinedDate < today) {
            const dateStr = joinedDate.toISOString().split('T')[0];
            if (!newData[dateStr]) {
                const prevDate = new Date(joinedDate);
                const nextDate = new Date(joinedDate);
                while (!newData[prevDate.toISOString().split('T')[0]]) {
                    prevDate.setDate(prevDate.getDate() - 1);
                    if (prevDate < joinedDate) {
                        break;
                    }
                    if (prevDate < joinedDate) {
                        break;
                    }
                }
                while (!newData[nextDate.toISOString().split('T')[0]] && nextDate <= today) {
                    nextDate.setDate(nextDate.getDate() + 1);
                }
                const prevSubs = newData[prevDate.toISOString().split('T')[0]];
                const nextSubs = newData[nextDate.toISOString().split('T')[0]];
                const prevDateTimestamp = prevDate.getTime();
                const nextDateTimestamp = nextDate.getTime();
                const dateTimestamp = joinedDate.getTime();
                const subs = Math.round(((nextSubs - prevSubs) / (nextDateTimestamp - prevDateTimestamp)) * (dateTimestamp - prevDateTimestamp) + prevSubs);
                newData[dateStr] = subs;
                console.log(`Calculated subscribers for ${dateStr}: ${subs}`);
            } else {
                newData[dateStr] = parseInt(newData[dateStr]);
            }
            joinedDate.setDate(joinedDate.getDate() + 1);
        }
        let newNewData = {};
        newData = Object.keys(newData).sort().forEach((key) => {
            if (newData[key] == "null") {
                delete newData[key];
            } else {
                newNewData[key] = parseInt(newData[key]);
            }
        });
        fs.writeFile('newData.json', JSON.stringify(newNewData, "null", 2));
    }
})();

async function tubealytics() {
    try {
        console.log('https://www.trackalytics.com/youtube/user/' + config.id + '/')
        const res = await fetch('https://www.trackalytics.com/youtube/user/' + config.id + '/');
        let body = await res.text();
        body = body.replace(/\n/g, '');
        body = body.replace(/ /g, '');
        let subsTest = body.split(`series:[{type:'area',name:'Subscribers',data:`)[1].split(`]}]`)[0];
        subsTest = subsTest.split(`[Date.UTC(`);
        subsTest.shift();
        for (const sub of subsTest) {
            let date = sub.split(`), `)[0]
            date = date.split(`,`)[0] + '-' + date.split(`,`)[1].slice(0, 2) + '-' + date.split(`,`)[2];
            date = date.replace(')', '')
            const subs = sub.split(`),`)[1].split(`],`)[0];
            if (!data[date]) {
                data[date] = subs
            }
        }
        await fs.writeFile('data.json', JSON.stringify(data, "null", 2));
    } catch (e) { }
}

async function filmot() {
    fetch('https://filmot.com/channel/' + config.id)
        .then(res => res.text())
        .then(body => {
            try {
                let subsTest = body.split(`window.graphdata1=[["DAY","SUBSCRIBERS"],`)[1].split(`]];`)[0];
                subsTest = '[' + subsTest + ']]';
                subsTest = subsTest.split(`["`);
                subsTest.shift();
                for (const sub of subsTest) {
                    let date = sub.split(`",`)[0];
                    const subs = sub.split(`",`)[1].split(`]`)[0];
                    if (!data[date]) {
                        data[date] = subs
                    }
                }
                fs.writeFile('data.json', JSON.stringify(data, "null", 2));
            } catch (e) { }
        })
}

async function youtubersDotMe() {
    fetch(config.data.youtubersDotMe.url)
        .then(res => res.text())
        .then(body => {
            body = body.replace(/\n/g, '');
            body = body.replace(/ /g, '');
            try {
                let subsTest = body.split(`document.getElementById('overviewSubscribers'),`)[1].split(`title`)[0];
                subsTest = subsTest.split(`date,`)[1].split(`',{`)[0];
                subsTest = subsTest.split(`\\n`);
                subsTest.shift();
                console.log(subsTest)
                for (const sub of subsTest) {
                    let date = sub.split(`,`)[0];
                    const subs = sub.split(`,`)[1];
                    console.log(date, subs)
                    if (!data[date]) {
                        data[date] = subs
                    }
                }
                fs.writeFile('data.json', JSON.stringify(data, "null", 2));
            } catch (e) {
                console.error(e)
            }
        })
}

async function axernSpace() {
    fetch('https://analyticsapi.axern.space/youtube/channel/' + config.id)
        .then(res => res.json())
        .then(body => {
            if (body.data) {
                let subsTest = body.data.data.daily;
                for (const sub of subsTest) {
                    let date = sub["YYYY-MM-DD"];
                    const subs = sub.subscribers.total.toString()
                    if (!data[date]) {
                        data[date] = subs
                    }
                    console.log(date, subs)
                    fs.writeFile('data.json', JSON.stringify(data, "null", 2));
                }
            }
        })
}

async function speakrj() {
    var today = new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-' + new Date().getDate();
    fetch('https://www.speakrj.com/audit/report/' + config.id + '/youtube/summary/2020-05-16/' + today)
        .then(res => res.text())
        .then(body => {
            body = body.replace(/\n/g, '');
            body = body.replace(/ /g, '');
            try {
                let datesTest = JSON.parse(body.split(`newChart(subscribers_chart_context,{type:'line',data:{labels:`)[1].split(`,datasets:`)[0]);
                let subsTest = JSON.parse(body.split(`datasets:[{label:"Subscribers",data:`)[1].split(`,backgroundColor:`)[0])
                for (let i = 0; i < datesTest.length; i++) {
                    let date = datesTest[i];
                    const subs = subsTest[i];
                    if (!data[date]) {
                        data[date] = subs
                    }
                }
                fs.writeFile('data.json', JSON.stringify(data, "null", 2));
            } catch (e) {
                console.error(e)
            }
        })
}

async function getData() {
    try {
        return await fs.readFile('data.json', 'utf8');
    } catch (e) {
        return '{}';
    }
}