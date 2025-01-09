import prisma from "../../lib/prisma.js";
import {decryptSymmetric, encryptSymmetric} from "../../helpers/encryption.js";
import {keys} from "../../config/keys.js";
import {getWowoUser} from "../../helpers/getWowoUser.js";

export async function SetTelegram(content, ip) {
    let response = {
        code: 200,
        message: "",
        data: '',
    }

    try {
        const body = JSON.parse(await decryptSymmetric(content.data, content.iv, keys.wowoEncryptionKey));

        const uniqUserId = body.uniqUserId;
        const xrdAddress = body.xrdAddress;
        const telegramData = JSON.stringify(body.telegramData);

        let wowoUser = await getWowoUser(ip, uniqUserId, xrdAddress);

        let wowoUserUpdated = null;

        if (wowoUser !== null && telegramData) {
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
                                "cheatEvents": "Login telegram : same id between " + wowoTelegramsUser.id + " and " + wowoUser.id
                            }
                        });
                    }
                }
            }

            wowoUserUpdated = await prisma.wowoUser.update({
                where: {
                    id: wowoUser.id
                },
                data: {
                    "isCheater": !wowoUser.isCheater ? isCheater : true,
                    "telegramData": telegramData
                }
            });
        }

        response.data = (await encryptSymmetric(
            JSON.stringify({
                    confirmation: !!wowoUserUpdated.telegramData
                }
            ),
            keys.wowoEncryptionKey,
            content.iv
        )).ciphertext;

    } catch (e) {
        console.log(e);
        response.code = 500;
    }

    return response;
}
