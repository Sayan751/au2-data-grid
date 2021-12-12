import {
  createServer,
  IncomingMessage,
  ServerResponse,
} from 'http';
import {
  URLSearchParams,
} from 'url';
import {
  people,
} from './data';

const port = 9000;
const server = createServer(requestHandler);
server.listen(port, () => {
  console.log(`The service is running on http://localhost:${port}`);
});

function requestHandler(req: IncomingMessage, res: ServerResponse) {
  // parse the URL
  const url = req.url!;
  const parts = url.split('?');
  const pathParts = parts[0].split('/').filter(p => p);
  if (pathParts.length !== 1) {
    console.log('here1');
    respondWithContract(res);
    return;
  }

  let data: unknown[] = undefined!;
  switch (pathParts[0]) {
    case 'people':
      data = people;
      break;
    default:
      res.writeHead(404);
      res.end();
      return;
  }

  const query = parts[1];
  if (!query) {
    respondJson(res, data);
    return;
  }

  let search: URLSearchParams;
  try {
    search = new URLSearchParams(query)
  } catch {
    respondBadRequest(res, `Invalid query ${query}`);
    return;
  }

  const item: any = data[0];
  // apply filter
  const filterExpr = search.get('$filter');
  if (filterExpr) {
    const predicates: ((value: any) => boolean)[] = [];
    let matches: RegExpExecArray | null;
    while ((matches = filterRe.exec(filterExpr)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (matches.index === filterRe.lastIndex) {
        filterRe.lastIndex++;
      }
      const groups = matches.groups!;
      const field = groups.field
      if (item[field] === undefined) {
        respondBadRequest(res, `Unknown property ${field} for filter`);
        return;
      }
      const predicate = groups.operator === 'eq'
        ? (value: any) => value[field] == groups.value
        : (value: any) => (value[field] as string).includes(groups.value);
      predicates.push(predicate);
    }
    data = data.filter((value: any) => {
      for (const predicate of predicates) {
        if (!predicate(value)) return false;
      }
      return true;
    });
  }

  // apply count
  const hasCount = search.get('$count') === 'true';
  if (hasCount) {
    respondJson(res, { count: data.length });
    return;
  }

  // apply sorting
  const sortExpr = search.get('$orderby');
  if (sortExpr) {
    const comparers: ((a: any, b: any) => 1 | -1 | 0)[] = [];
    let matches: RegExpExecArray | null;
    while ((matches = orderByRe.exec(sortExpr)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (matches.index === orderByRe.lastIndex) {
        orderByRe.lastIndex++;
      }
      const groups = matches.groups!;
      const field = groups.field
      if (item[field] === undefined) {
        respondBadRequest(res, `Unknown property ${field} for orderby`);
        return;
      }
      const direction: 'asc' | 'desc' = groups.direction as 'asc' | 'desc' ?? 'asc';
      if (direction !== 'asc' && direction !== 'desc') {
        respondBadRequest(res, `Unknown sorting direction ${direction} for property ${field}`);
        return;
      }
      const comparer = (a: any, b: any) => {
        if (a[field] > b[field]) {
          return direction === 'asc' ? 1 : -1;
        } else if (a[field] < b[field]) {
          return direction === 'asc' ? -1 : 1;
        }
        return 0;
      }
      comparers.push(comparer);
    }
    for (const comparer of comparers) {
      data.sort(comparer)
    }
  }

  // apply paging
  const skipRaw = search.get('$skip');
  let skip = Number(skipRaw);
  if (Number.isNaN(skip)) { skip = 0; }

  const topRaw = search.get('$top');
  let top = Number(topRaw);
  if (Number.isNaN(top)) { top = data.length; }

  data = data.slice(skip, skip + top);
  respondJson(res, data);
}

const filterRe = /(?<field>.+)\s+(?<operator>eq|contains)\s+(?<value>.+)/g;
const orderByRe = /(?<field>.+)\s+(?<direction>asc|desc)?/g

function respondBadRequest(res: ServerResponse, data: string) {
  res.writeHead(400);
  res.end(data);
}
function respondJson(res: ServerResponse, data: unknown) {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify(data));
}

function respondWithContract(res: ServerResponse) {
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(serviceDocument);
}

// TODO: enhance the service doc
const serviceDocument = `<html>
  <head>
    <meta charset="utf-8">
    <title>Fake-service document</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body>
    <h2><code>/people</code></h2>
    <span>Returns a list of random people.</span>
  </body>
</html>`;