"use server";

import { fetchLastYearData } from "@/utils/fetch";

async function searchUserAction(previousState: any, formdata: FormData) {
    const username = formdata.get("input_search_username");

    if (!username) {
        throw new Error("Please enter a valid username");
    }

    const requestUser = await fetch(`https://api.github.com/users/${username}`);

    const owner = await requestUser.json();
    const contributions = await fetchLastYearData(username as string, "flat");

    const requestRepos = await fetch(
        `https://api.github.com/users/${username}/repos`
    );
    const repositories = await requestRepos.json();

    return {
        owner,
        contributions,
        repositories,
    };
}

export { searchUserAction };
