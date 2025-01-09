import prisma from "../lib/prisma.js";

export async function getWowoUser(ip = null, uniqUserId = null, xrdAddress = null) {
    const whereOR = [];
    whereOR.push({
        ipAddresses: {
            contains: ip
        }
    });

    if (uniqUserId) {
        whereOR.push({
            uniqCodes: {
                contains: uniqUserId
            }
        })
    }

    if (xrdAddress) {
        whereOR.push({
            xrdAddresses: {
                contains: xrdAddress
            }
        })
    }

    const wowoUsers = await prisma.wowoUser.findMany({
        where: {
            OR: whereOR
        }
    });

    if (wowoUsers.length === 0) {
        return null;
    } else {
        return wowoUsers[0];
    }
}

