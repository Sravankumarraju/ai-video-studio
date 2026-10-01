(async () => {
  const response = await fetch("/api/jobs/382cf3c5-cfd0-498e-a4db-e60b6f9a9d9c/retry", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
  });
  return { status: response.status, result: await response.json() };
})()
