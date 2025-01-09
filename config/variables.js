export const variables = {
    get apiGwUrl() {
        return 'https://mainnet.radixdlt.com';
    },

    get sendingAddress() {
        return 'account_...'; //@TODO : Replace with your data
    },

    get radixTelegramChannel() {
        return -1001449313276;
    },
    get wowoTelegramChannel() {
        return -1001913360397;
    },

    get wowoCampaignStart() {
        return new Date(Date.UTC(2024, 9, 8, 0, 0, 0));
    },
    get wowoValidator() {
        return 'validator_rdx1s0qjxdwy5ssl9rnqquhv9gucpm6cvxvn8uwngw26c6y9ff06d6s3fy';
    },
}
