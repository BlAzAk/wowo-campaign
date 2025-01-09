import prisma from "../../lib/prisma.js";
import {decryptSymmetric, encryptSymmetric} from "../../helpers/encryption.js";
import {keys} from "../../config/keys.js";
import {getWowoUser} from "../../helpers/getWowoUser.js";
import {api} from "../../helpers/api.js";
import {rris} from "../../config/rris.js";

export async function ClaimStep1(content, ip) {
    let response = {
        code: 200,
        message: "",
        data: '',
    }

    try {
        const body = JSON.parse(await decryptSymmetric(content.data, content.iv, keys.wowoEncryptionKey));

        const uniqUserId = body.uniqUserId;
        const xrdAddress = body.xrdAddress;

        let wowoUser = await getWowoUser(ip, uniqUserId, xrdAddress);

        if (wowoUser !== null && !wowoUser.isCheater && !wowoUser.isFarmer) {
            const step1Reward = await prisma.wowoReward.findFirst({
                where: {
                    wowoUserId: wowoUser.id,
                    step: "step1"
                }
            });

            if (!step1Reward) {
                const waves = await prisma.wowoWave.findMany({
                    where: {
                        active: true
                    }
                });
                if (waves.length > 0) {
                    const wave = waves[0];

                    if ((wave.nbUsers + 1) <= wave.slots) {
                        const transaction = await api.sendSimpleTransaction(keys.sendingAddressPrivateKey, xrdAddress, rris.XRD, 2);

                        const reward = await prisma.wowoReward.create({
                            data: {
                                xrdAddress: xrdAddress,
                                state: 'completed',
                                rewardTrxId: transaction.transactionId,
                                data: '',
                                wowoUserId: wowoUser.id,
                                step: "step1"
                            }
                        });

                        await prisma.wowoUser.update({
                            where: {
                                id: wowoUser.id
                            },
                            data: {
                                wowoWaveId: wave.id
                            }
                        });

                        await prisma.wowoWave.update({
                            where: {
                                id: wave.id
                            },
                            data: {
                                nbUsers: wave.nbUsers + 1
                            }
                        });

                        response.data = (await encryptSymmetric(
                            JSON.stringify({
                                    claimed: true
                                }
                            ),
                            keys.wowoEncryptionKey,
                            content.iv
                        )).ciphertext;
                    } else {
                        response.code = 401;
                    }
                } else {
                    response.code = 401;
                }
            } else {
                response.code = 401;
            }
        } else {
            response.code = 404;
        }
    } catch (e) {
        console.log(e);
        response.code = 500;
    }

    return response;
}
