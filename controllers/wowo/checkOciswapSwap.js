import prisma from "../../lib/prisma.js";
import {api} from "../../helpers/api.js";
import {rris} from "../../config/rris.js";
import {variables} from "../../config/variables.js";

export async function checkOciswapSwap(wowoUser, xrdAddress) {
    let step2Reward = await prisma.wowoReward.findFirst({
        where: {
            wowoUserId: wowoUser.id,
            step: "step2"
        }
    });

    if (!step2Reward) {
        //STEP 1 MUST BE COMPLETED BEFORE STEP 2
        const step1Reward = await prisma.wowoReward.findFirst({
            where: {
                wowoUserId: wowoUser.id,
                step: "step1",
                state: "completed"
            }
        });
        if (step1Reward) {
            let swapFound = false;
            const transactions = await api.getTransactions(xrdAddress, rris.WOWO);

            for (const transaction of transactions) {
                if (transaction.confirmed_at > variables.wowoCampaignStart) {
                    const hasSentXRDTrxs = transaction.balance_changes.fungible_balance_changes.filter(act => {
                        if (act.entity_address === xrdAddress && Number(act.balance_change) <= -1 && act.resource_address === rris.XRD) {
                            return true
                        }

                        return false;
                    });

                    const hasReceivedWOWOTrxs = transaction.balance_changes.fungible_balance_changes.filter(act => {
                        if (act.entity_address === xrdAddress && Number(act.balance_change) > 0 && act.resource_address === rris.WOWO) {
                            return true
                        }

                        return false;
                    })

                    if (hasSentXRDTrxs.length > 0 && hasReceivedWOWOTrxs.length > 0) {
                        swapFound = true;
                    }
                }
            }

            if (swapFound) {
                step2Reward = await prisma.wowoReward.findFirst({
                    where: {
                        wowoUserId: wowoUser.id,
                        step: "step2"
                    }
                });
                if (!step2Reward) {
                    const reward = await prisma.wowoReward.create({
                        data: {
                            xrdAddress: xrdAddress,
                            state: 'claimable',
                            rewardTrxId: '',
                            data: '',
                            wowoUserId: wowoUser.id,
                            step: "step2"
                        }
                    });
                }
            }
        }
    }
}
