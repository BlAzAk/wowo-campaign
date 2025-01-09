import prisma from "../../lib/prisma.js";

await prisma.wowoUser.updateMany({
    data: {
        isCheater: false
    }
});

let wowoUsers = await prisma.wowoUser.findMany({
    where: {
        isCheater: false
    }
});

//Telegram duplicates
for (const wowoUser of wowoUsers) {
    const telegramData = JSON.parse(wowoUser.telegramData || '{}');
    let isCheater = false;
    if (telegramData.id) {
        for (const wowoUser2 of wowoUsers) {
            const telegramData2 = JSON.parse(wowoUser2.telegramData || '{}');
            if (telegramData2.id && wowoUser.id !== wowoUser2.id) {
                if (telegramData.id === telegramData2.id) {
                    isCheater = true;
                    break;
                }
            }
        }
    }
    if (isCheater) {
        await prisma.wowoUser.update({
            where: {
                id: wowoUser.id
            },
            data: {
                isCheater: true
            }
        });
    }
}

//Multiple rewards
/*
let wowoRewards = await prisma.wowoReward.findMany({
    where: {
        state: 'completed'
    }
});
for (const wowoReward of wowoRewards) {
    let isCheater = false;
    for (const wowoReward2 of wowoRewards) {
        if (
            wowoReward.id !== wowoReward2.id &&
            wowoReward.step === wowoReward2.step &&
            wowoReward.wowoUserId === wowoReward2.wowoUserId
        ) {
                isCheater = true;
                break;
        }
    }
    if (isCheater) {
        await prisma.wowoUser.update({
            where: {
                id: wowoReward.wowoUserId
            },
            data: {
                isCheater: true
            }
        });
    }
}*/

//Referral banned
const bannedReferrers = [
    'tg6t0bdhb4',
    'vmpm42j0vfg',
]
for (const wowoUser of wowoUsers) {
    if (bannedReferrers.includes(wowoUser.referrer)) {
        await prisma.wowoUser.update({
            where: {
                id: wowoUser.id
            },
            data: {
                isCheater: true
            }
        });
    }
}

//Multi IP
for (const wowoUser of wowoUsers) {
    if (wowoUser.ipAddresses.split('|').length > 10) {
        await prisma.wowoUser.update({
            where: {
                id: wowoUser.id
            },
            data: {
                isCheater: true
            }
        });
    }
}

//Multi addresses
for (const wowoUser of wowoUsers) {
    if (wowoUser.xrdAddresses.split('|').length > 5) {
        await prisma.wowoUser.update({
            where: {
                id: wowoUser.id
            },
            data: {
                isCheater: true
            }
        });
    }
}