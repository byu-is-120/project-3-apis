export async function GetFlightData() {
  return {
    data: {
      api: "flights",
    },
    updated: new Date().toISOString(),
  };
}
