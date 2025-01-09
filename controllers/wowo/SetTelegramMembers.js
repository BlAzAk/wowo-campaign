import prisma from "../../lib/prisma.js";
import {GetUsers} from "./GetUsers.js";

export async function SetTelegramMembers(body) {
    let response = {
        code: 200,
        message: "",
        data: '',
    }

    const wowoUsers = (await GetUsers()).data.users;

    for (let wowoUser of wowoUsers) {
        const userChannels = body.usersChannels.find(userChan => (wowoUser.uniqCodes.includes(userChan.wowoUserId) || wowoUser.id === userChan.wowoUserId));
        if (userChannels) {
            const telegramData = JSON.parse(wowoUser.telegramData) ?? {};
            telegramData['id'] = telegramData.id ?? '';
            telegramData['firstName'] = telegramData.firstName ?? '';
            telegramData['lastName'] = telegramData.lastName ?? '';
            telegramData['userName'] = telegramData.userName ?? '';
            telegramData['channelsMember'] = telegramData.channelsMember ?? [];

            if (userChannels.channels) {
                let arr = telegramData.channelsMember.concat(userChannels.channels);
                telegramData.channelsMember = [...new Set(arr)]
            }
            if (userChannels.telegramId) {
                telegramData.id = userChannels.telegramId
            }
            if (userChannels.firstname) {
                telegramData.firstName = userChannels.firstname
            }
            if (userChannels.lastname) {
                telegramData.lastName = userChannels.lastname
            }
            if (userChannels.username) {
                telegramData.userName = '@' + userChannels.username
            }

            let wowoTelegramsUsers = await prisma.wowoUser.findMany({
                where: {
                    NOT: {
                        telegramData: null
                    }
                }
            });
            let isCheater = false;
            for (const wowoTelegramsUser of wowoTelegramsUsers) {
                const wowoTelegramsUserTelegramData = JSON.parse(wowoTelegramsUser.telegramData || '{}');
                if (wowoTelegramsUserTelegramData.id) {
                    if (wowoTelegramsUserTelegramData.id === telegramData.id && wowoTelegramsUser.id !== wowoUser.id) {
                        isCheater = true;
                        await prisma.wowoUser.update({
                            where: {
                                id: wowoTelegramsUser.id
                            },
                            data: {
                                "isCheater": true,
                                "cheatEvents": "Telegram members : same id between " + wowoTelegramsUser.id + " and " + wowoUser.id
                            }
                        });
                    }
                }
            }

            //wowoUserId
            const wowoUserUpdated = await prisma.wowoUser.update({
                where: {
                    id: wowoUser.id
                },
                data: {
                    "isCheater": !wowoUser.isCheater ? isCheater : true,
                    "telegramData": JSON.stringify(telegramData)
                }
            });
        }
    }

    return response;
}
