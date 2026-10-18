function getSafeDatabaseErrorDetails(error) {
  if (!error || error.code !== "42P01") return {};

  const messageMatch = typeof error.message === "string"
    ? error.message.match(/^relation "([^"\r\n]{1,128})" does not exist$/i)
    : null;
  const relation = typeof error.table === "string"
    ? error.table
    : messageMatch && messageMatch[1];
  const details = { databaseMessage: "relation does not exist" };

  if (messageMatch) details.databaseMessage = `relation "${messageMatch[1]}" does not exist`;
  if (relation && relation.length <= 128) details.databaseRelation = relation;
  if (typeof error.schema === "string" && error.schema.length <= 128) {
    details.databaseSchema = error.schema;
  }

  return details;
}

module.exports = { getSafeDatabaseErrorDetails };
