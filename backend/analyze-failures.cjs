const fs = require('fs');

try {
    const data = fs.readFileSync('test-results.json', 'utf8');
    const results = JSON.parse(data);

    let failures = [];

    if (results.testResults) {
        for (const fileResult of results.testResults) {
            for (const assertionResult of fileResult.assertionResults) {
                if (assertionResult.status === 'failed') {
                    failures.push({
                        file: fileResult.name,
                        title: assertionResult.title,
                        fullName: assertionResult.fullName,
                        messages: assertionResult.failureMessages
                    });
                }
            }
        }
    }

    console.log(`Total Failures: ${failures.length}`);
    failures.forEach((f, i) => {
        console.log(`\n--- Failure ${i + 1} ---`);
        console.log(`File: ${f.file}`);
        console.log(`Test: ${f.fullName}`);
        console.log(`Message: ${f.messages[0]?.split('\n')[0]}`); // First line of message
    });

} catch (e) {
    console.error("Error parsing results:", e);
}
