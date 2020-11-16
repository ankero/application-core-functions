export function parseRequestBody(req: any) {
  switch (req.get("content-type")) {
    case "application/octet-stream":
      return req.body.toString();
  }
  return req;
}
