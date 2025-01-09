import prisma from "../../lib/prisma.js";
import {decryptSymmetric, encryptSymmetric} from "../../helpers/encryption.js";
import {keys} from "../../config/keys.js";
import {getWowoUser} from "../../helpers/getWowoUser.js";
import {api} from "../../helpers/api.js";
import {rris} from "../../config/rris.js";
import {
    address,
    array,
    bucket,
    decimal, enumeration,
    ManifestBuilder,
    nonFungibleLocalId,
    ValueKind
} from "@radixdlt/radix-engine-toolkit";
import {variables} from "../../config/variables.js";

export async function ClaimStep5(content, ip) {
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
            let step5Reward = await prisma.wowoReward.findFirst({
                where: {
                    wowoUserId: wowoUser.id,
                    step: "step5",
                    state: "claimable"
                }
            });

            if (step5Reward) {
                let step5RewardsClaimed = await prisma.wowoReward.findMany({
                    where: {
                        step: "step5",
                        state: "completed"
                    }
                });

                const NFTId = step5RewardsClaimed.length + 1;

                const manifest = new ManifestBuilder()
                    .callMethod(
                        variables.sendingAddress,
                        "lock_fee",
                        [
                            decimal(10),      // Montant à retirer pour couvrir les frais (à ajuster selon les besoins)
                        ]
                    )
                    .callMethod(
                        variables.sendingAddress,
                        "withdraw_non_fungibles",
                        [
                            address(rris.wowoNFT),
                            array(ValueKind.NonFungibleLocalId, nonFungibleLocalId('#' + NFTId + '#')),
                        ]
                    )
                    .takeNonFungiblesFromWorktop(
                        rris.wowoNFT,
                        [
                            '#' + NFTId + '#'
                        ],
                        //array(ValueKind.NonFungibleLocalId, nonFungibleLocalId('#0#')),
                        (builder, bucketId) =>
                            builder.callMethod(
                                step5Reward.xrdAddress,
                                "try_deposit_or_abort",
                                [bucket(bucketId), enumeration(0)]
                            )
                    )
                    .build();


                const transactionSend = await api.sendManifest(keys.sendingAddressPrivateKey, manifest)

                if (transactionSend.code === 200) {
                    const reward = await prisma.wowoReward.updateMany({
                        where: {
                            wowoUserId: wowoUser.id,
                            step: "step5",
                        },
                        data: {
                            state: 'completed',
                            rewardTrxId: transactionSend.transactionId,
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
                    response.code = 500;
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
