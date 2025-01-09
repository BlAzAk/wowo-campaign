import prisma from "../../lib/prisma.js";
import {decryptSymmetric, encryptSymmetric} from "../../helpers/encryption.js";
import {keys} from "../../config/keys.js";
import {getWowoUser} from "../../helpers/getWowoUser.js";
import {api} from "../../helpers/api.js";
import {rris} from "../../config/rris.js";

export async function ClaimStep2(content, ip) {
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
            let step2Reward = await prisma.wowoReward.findFirst({
                where: {
                    wowoUserId: wowoUser.id,
                    step: "step2",
                    state: "claimable"
                }
            });

            if (step2Reward) {
                const transaction = await api.sendSimpleTransaction(keys.sendingAddressPrivateKey, xrdAddress, rris.WOWO, 100);

                const reward = await prisma.wowoReward.updateMany({
                    where: {
                        wowoUserId: wowoUser.id,
                        step: "step2",
                    },
                    data: {
                        state: 'completed',
                        rewardTrxId: transaction.transactionId,
                        updatedAt: new Date()
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
            response.code = 404;
        }
    } catch (e) {
        console.log(e);
        response.code = 500;
    }

    return response;
}
