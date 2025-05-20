import axios from "axios";

const LEETCODE_API_ENDPOINT = "https://leetcode.com/graphql";
const DAILY_CODING_CHALLENGE_QUERY = `
query questionOfToday {
  activeDailyCodingChallengeQuestion {
    date
    userStatus
    link
    question {
      acRate
      difficulty
      freqBar
      frontendQuestionId: questionFrontendId
      isFavor
      paidOnly: isPaidOnly
      status
      title
      titleSlug
      hasVideoSolution
      hasSolution
      topicTags {
        name
        id
        slug
      }
    }
  }
}`;

/**
 * Fetches the active daily coding challenge question from LeetCode.
 * @returns {Promise<Object|null>} The question data or null if an error occurs.
 */
export const getDailyCodingChallenge = async () => {
  try {
    const response = await axios.post(
      LEETCODE_API_ENDPOINT,
      {
        query: DAILY_CODING_CHALLENGE_QUERY,
        variables: {},
      },
      {
        headers: {
          "Content-Type": "application/json",
          // 'Referer': 'https://leetcode.com/problemset/all/', // Sometimes helps
        },
      }
    );

    if (
      response.data &&
      response.data.data &&
      response.data.data.activeDailyCodingChallengeQuestion
    ) {
      return response.data.data.activeDailyCodingChallengeQuestion;
    }
    console.warn("[LeetCodeAPI] Unexpected response structure:", response.data);
    return null;
  } catch (error) {
    console.error(
      "[LeetCodeAPI] Error fetching daily challenge:",
      error.message
    );
    if (error.response) {
      console.error("[LeetCodeAPI] Response Data:", error.response.data);
      console.error("[LeetCodeAPI] Response Status:", error.response.status);
    }
    return null;
  }
};
