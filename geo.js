/**
 * Great-circle distance between two lat/lng points, in meters.
 * Mirrors the calculation used client-side in script.js so duplicate
 * detection stays consistent whether it runs in the browser or on the server.
 */
function distanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Generates a ticket id in the format UE-XXXX, guaranteed unique
 * against the provided Mongoose model.
 */
async function generateTicketId(IssueModel) {
  let ticketId;
  let exists = true;
  while (exists) {
    const num = Math.floor(1000 + Math.random() * 9000);
    ticketId = `UE-${num}`;
    // eslint-disable-next-line no-await-in-loop
    exists = await IssueModel.exists({ ticketId });
  }
  return ticketId;
}

module.exports = { distanceInMeters, generateTicketId };
