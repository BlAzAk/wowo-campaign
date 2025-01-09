import prisma from "../../lib/prisma.js";
import {decryptSymmetric, encryptSymmetric} from "../../helpers/encryption.js";
import {keys} from "../../config/keys.js";
import {getWowoUser} from "../../helpers/getWowoUser.js";
import {api} from "../../helpers/api.js";
import {rris} from "../../config/rris.js";

export async function ClaimStep4(content, ip) {
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
            let step4Reward = await prisma.wowoReward.findFirst({
                where: {
                    wowoUserId: wowoUser.id,
                    step: "step4",
                    state: "claimable"
                }
            });

            if (step4Reward) {
                const transaction = await api.sendSimpleTransaction(keys.sendingAddressPrivateKey, xrdAddress, rris.WOWO, 2000);
                const transaction2 = await api.sendSimpleTransaction(keys.sendingAddressPrivateKey, xrdAddress, rris.XRD, 75);

                const reward = await prisma.wowoReward.updateMany({
                    where: {
                        wowoUserId: wowoUser.id,
                        step: "step4",
                    },
                    data: {
                        state: 'completed',
                        rewardTrxId: transaction.transactionId + '|' + transaction2.transactionId,
                        updatedAt: new Date()
                    }
                });

                if (wowoUser.referrer) {
                    const wowoUserReferrer = await prisma.wowoUser.findFirst({
                        where: {
                            uniqCodes: {
                                contains: wowoUser.referrer
                            }
                        }
                    });

                    if (wowoUserReferrer && !wowoUserReferrer.isCheater && !wowoUserReferrer.isFarmer) {
                        const referrerAddress = wowoUserReferrer.xrdAddresses.split('|')[0];
                        const transaction3 = await api.sendSimpleTransaction(keys.sendingAddressPrivateKey, referrerAddress, rris.XRD, 100);
                        const rewardReferrer = await prisma.wowoReward.create({
                            data: {
                                wowoUserId: wowoUserReferrer.id,
                                xrdAddress: referrerAddress,
                                step: "referral",
                                state: "sent",
                                data: JSON.stringify({'referral': wowoUser.id}),
                                rewardTrxId: transaction3.transactionId,
                            }
                        });
                    }
                }

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
            response.code = 404;
        }
    } catch (e) {
        console.log(e);
        response.code = 500;
    }

    return response;
}
