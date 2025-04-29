import cron from "node-cron";
import Student from "../models/student.models.js";

// Runs every minute to check active tests of all students
cron.schedule("* * * * *", async () => {
  const now = new Date();

  try {
    // Step 1: Find all students who have any active tests
    const studentsWithActiveTests = await Student.find({})
      .select("_id ActiveTests")
      .populate("ActiveTests", "endingTime"); // Correct populate

    const studentBulkUpdates = [];

    for (const student of studentsWithActiveTests) {
      const expiredTests = student.ActiveTests.filter(
        (test) => test && test.endingTime <= now
      );

      if (expiredTests.length > 0) {
        const expiredTestIds = expiredTests.map((test) => test._id);

        studentBulkUpdates.push({
          updateOne: {
            filter: { _id: student._id },
            update: {
              $pull: { ActiveTests: { $in: expiredTestIds } }, // Directly remove by _id
              $push: { oldTests: { $each: expiredTestIds } },  // Push to oldTests
            },
          },
        });
      }
    }

    if (studentBulkUpdates.length > 0) {
      await Student.bulkWrite(studentBulkUpdates);
      console.log(`Updated ${studentBulkUpdates.length} students with expired tests.`);
    }
  } catch (error) {
    console.error("Error in moving expired tests:", error.message);
  }
});
