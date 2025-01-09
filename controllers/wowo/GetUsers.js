import prisma from "../../lib/prisma.js";

export async function GetUsers() {
    let response = {
        code: 200,
        message: "",
        data: '',
    }

    const users = await prisma.wowoUser.findMany();

    response.data = {
        users: users
    }

    return response;
}
