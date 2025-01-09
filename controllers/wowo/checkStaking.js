import prisma from "../../lib/prisma.js";
import {api} from "../../helpers/api.js";
import {rris} from "../../config/rris.js";
import {variables} from "../../config/variables.js";
import {addDays} from "../../helpers/addDays.js";

export async function checkStaking(wowoUser, xrdAddress) {
    let step4Reward = await prisma.wowoReward.findFirst({
        where: {
            wowoUserId: wowoUser.id,
            step: "step4"
        }
    });

    if (!step4Reward) {
        //STEP 3 MUST BE COMPLETED BEFORE STEP 4
        const step3Reward = await prisma.wowoReward.findFirst({
            where: {
                wowoUserId: wowoUser.id,
                step: "step3",
                state: "completed"
            }
        });
        if (step3Reward) {
            const stakingDate = await getStakingDate(xrdAddress, step3Reward);

            if (stakingDate !== null) {
                step4Reward = await prisma.wowoReward.findFirst({
                    where: {
                        wowoUserId: wowoUser.id,
                        step: "step4"
                    }
                });
                if (!step4Reward) {
                    const reward = await prisma.wowoReward.create({
                        data: {
                            xrdAddress: xrdAddress,
                            state: 'in progress',
                            rewardTrxId: '',
                            data: JSON.stringify({"stakingDate": stakingDate}),
                            wowoUserId: wowoUser.id,
                            step: "step4"
                        }
                    });
                }
            }
        }
    } else {
        const step3Reward = await prisma.wowoReward.findFirst({
            where: {
                wowoUserId: wowoUser.id,
                step: "step3",
                state: "completed"
            }
        });
        if (step3Reward) {
            const stakingDate = await getStakingDate(xrdAddress, step3Reward);

            if (stakingDate !== null) {
                if (addDays(stakingDate, 7) < (new Date())) {
                    step4Reward = await prisma.wowoReward.updateMany({
                        where: {
                            wowoUserId: wowoUser.id,
                            step: "step4",
                            state: "in progress"
                        },
                        data: {
                            state: "claimable"
                        }
                    });
                }
            }
        }
    }
}

async function getStakingDate(xrdAddress, step3Reward) {
    let stakingDate = null;
    const transactions = await api.getTransactions(xrdAddress, rris.wowoLSU);

    for (const transaction of transactions) {
        const hasSentXRDTrxs = transaction.balance_changes.fungible_balance_changes.filter(act => {
            if (act.entity_address === xrdAddress && Number(act.balance_change) <= -1000 && act.resource_address === rris.XRD) {
                return true
            }

            return false;
        });

        const hasReceivedWOWOTrxs = transaction.balance_changes.fungible_balance_changes.filter(act => {
            if (act.entity_address === xrdAddress && Number(act.balance_change) > 0 && act.resource_address === rris.wowoLSU) {
                return true
            }

            return false;
        })

        const validatorHasReceivedXRDTrxs = transaction.balance_changes.fungible_balance_changes.filter(act => {
            if (act.entity_address === variables.wowoValidator && Number(act.balance_change) >= 1000 && act.resource_address === rris.XRD) {
                return true
            }

            return false;
        })

        if (hasSentXRDTrxs.length > 0 && hasReceivedWOWOTrxs.length > 0 && validatorHasReceivedXRDTrxs.length > 0 && (stakingDate === null || transaction.confirmed_at < stakingDate)) {
            stakingDate = transaction.confirmed_at;
        }
    }

    if (stakingDate === null) {
        return null;
    } else {
        return stakingDate < step3Reward.createdAt ? step3Reward.createdAt : stakingDate;
    }
}