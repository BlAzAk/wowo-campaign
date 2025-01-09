import prisma from "../../lib/prisma.js";
import {decryptSymmetric, encryptSymmetric} from "../../helpers/encryption.js";
import {keys} from "../../config/keys.js";
import {getWowoUser} from "../../helpers/getWowoUser.js";

export async function GetUser(content, ip, action) {
    let response = {
        code: 200,
        message: "",
        data: '',
    }

    const bannedReferrers = [
        'tg6t0bdhb4',
        'vmpm42j0vfg',
    ]

    try {
        const body = JSON.parse(await decryptSymmetric(content.data, content.iv, keys.wowoEncryptionKey));

        const uniqUserId = body.uniqUserId;
        const xrdAddress = body.xrdAddress;
        const referrer = body.referrer;

        let wowoUser = await getWowoUser(ip, uniqUserId, xrdAddress);

        let user = null;
        if (wowoUser === null) {
            const waves = await prisma.wowoWave.findMany({
                where: {
                    active: true
                }
            });
            if (waves.length > 0) {
                const wave = waves[0];

                if ((wave.nbUsers + 1) <= wave.slots) {
                     user = await prisma.wowoUser.create({
                        data: {
                            "ipAddresses": ip + "|",
                            "uniqCodes": (uniqUserId ? uniqUserId : Math.random().toString(32).slice(2)) + "|",
                            "xrdAddresses": xrdAddress ? (xrdAddress + "|") : '',
                            "isCheater": action === 'ban' || bannedReferrers.includes(referrer),
                            "cheatEvents": action ? (action + "|") : '',
                            "referrer": referrer ?? '',
                            "data": '',
                            'wowoWaveId': wave.id
                        }
                    });
                    user["inWave"] = true;
                } else {
                    user = {
                        "inWave": false,
                        "uniqCodes": (uniqUserId ? uniqUserId : Math.random().toString(32).slice(2)) + "|",
                    }
                }
            } else {
                user = {
                    "inWave": false,
                    "uniqCodes": (uniqUserId ? uniqUserId : Math.random().toString(32).slice(2)) + "|",
                }
            }
        } else {
            user = wowoUser;
            user["inWave"] = true;

            if (!user.ipAddresses.includes(ip)) { //L'ip ne correspond pas à celle qui est trouvé
                await prisma.wowoUser.update({
                    where: {
                        id: user.id
                    },
                    data: {
                        "isCheater": !user.isCheater ? action === 'ban' : true,
                        "cheatEvents": action ? (user.cheatEvents + action + "|") : user.cheatEvents,
                        "ipAddresses": user.ipAddresses + ip + "|"
                    }
                });
            }

            if (uniqUserId && !user.uniqCodes.includes(uniqUserId)) { //Le uniqCode ne correspond pas à celui qui est trouvé
                await prisma.wowoUser.update({
                    where: {
                        id: user.id
                    },
                    data: {
                        "isCheater": !user.isCheater ? action === 'ban' : true,
                        "cheatEvents": action ? (user.cheatEvents + action + "|") : user.cheatEvents,
                        "uniqCodes": user.uniqCodes + uniqUserId + "|"
                    }
                });
            }

            if (xrdAddress && !user.xrdAddresses.includes(xrdAddress)) { //L'address XRD ne correspond pas à celle qui est trouvée
                await prisma.wowoUser.update({
                    where: {
                        id: user.id
                    },
                    data: {
                        "isCheater": !user.isCheater ? action === 'ban' : true,
                        "cheatEvents": action ? (user.cheatEvents + action + "|") : user.cheatEvents,
                        "xrdAddresses": user.xrdAddresses + xrdAddress + "|"
                    }
                });
            }

            if (action === 'ban') {
                await prisma.wowoUser.update({
                    where: {
                        id: user.id
                    },
                    data: {
                        "isCheater": true,
                        "cheatEvents": "Banned by frontend"
                    }
                });
            }
        }

        response.data = (await encryptSymmetric(
            JSON.stringify({
                    inWave: user['inWave'],
                    uniqUserId: user.uniqCodes.split("|")[0]
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
