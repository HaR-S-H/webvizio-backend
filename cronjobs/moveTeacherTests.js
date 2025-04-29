import cron from "node-cron";
import Teacher from "../models/teacher.models.js";
import Test from "../models/test.models.js";

// Runs every minute
cron.schedule("* * * * *", async () => {
  const now = new Date();

  try {
    // Step 1: Aggregate teachers with tests whose endingTime has passed
    const teachersWithExpiredTests = await Teacher.aggregate([
      { $unwind: "$ActiveTests" },
      {
        $lookup: {
          from: "tests",
          localField: "ActiveTests.testId",
          foreignField: "_id",
          as: "testDetails"
        }
      },
      { $unwind: "$testDetails" },
      {
        $match: {
          "testDetails.endingTime": { $lte: now }
        }
      },
      {
        $group: {
          _id: "$_id",
          expiredTests: {
            $push: {
              testId: "$ActiveTests.testId",
              githubLink: "$ActiveTests.githubLink"
            }
          }
        }
      }
    ]);

    // Step 2: Prepare bulk updates for moving tests to oldTests
    const bulkUpdates = teachersWithExpiredTests.map(teacher => ({
      updateOne: {
        filter: { _id: teacher._id },
        update: {
          $pull: {
            ActiveTests: {
              testId: { $in: teacher.expiredTests.map(t => t.testId) }
            }
          },
          $push: {
            oldTests: { $each: teacher.expiredTests }
          }
        }
      }
    }));

    // Step 3: Execute bulkWrite if there are expired tests
    if (bulkUpdates.length > 0) {
      await Teacher.bulkWrite(bulkUpdates);
      console.log(`Moved tests for ${bulkUpdates.length} teachers`);
    }
  } catch (error) {
    console.error("Error in teacher test mover:", error.message);
  }
});
