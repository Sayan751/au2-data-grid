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
  console.log('url:', url);
  const parts = url.split('?');
  const pathParts = parts[0].split('/').filter(p => p);
  if (pathParts.length !== 1) {
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
      // console.log(matches);
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
    console.log('data.length pre-filter', data.length);
    data = data.filter((value: any) => {
      for (const predicate of predicates) {
        if (!predicate(value)) return false;
      }
      return true;
    });
    console.log('data.length post-filter', data.length);
  }

  // apply count
  const hasCount = search.get('$count') === 'true';
  if (hasCount) {
    respondJson(res, { count: data.length });
    return;
  }

  // apply sorting
  const sortExpr = search.get('$orderby');
  console.log(sortExpr)
  if (sortExpr) {
    const comparers: ((a: any, b: any) => 1 | -1 | 0)[] = [];
    let matches: RegExpExecArray | null;
    while ((matches = orderByRe.exec(sortExpr)) !== null) {
      // console.log(matches)
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
    for (const comparer of comparers.reverse()) {
      data.sort(comparer)
    }
  }

  // apply paging
  const skipRaw = search.get('$skip');
  let skip = skipRaw == null ? 0 : Number(skipRaw);
  if (Number.isNaN(skip)) { skip = 0; }

  const topRaw = search.get('$top');
  let top = topRaw == null ? data.length : Number(topRaw);
  if (Number.isNaN(top)) { top = data.length; }

  console.log('data.length pre-paging', data.length);
  data = data.slice(skip, skip + top);
  console.log('data.length post-paging', data.length);
  respondJson(res, data);
}

const filterRe = /(?<field>[^\s,]+)\s+(?<operator>eq|contains)\s+(?<value>[^\s,]+)/g;
const orderByRe = /(?<field>[^\s,]+)\s*(?<direction>asc|desc)?/g

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': '*',
  'Access-Control-Allow-Headers': '*',
}

function respondBadRequest(res: ServerResponse, data: string) {
  res.writeHead(400, corsHeaders);
  res.end(data);
}
function respondJson(res: ServerResponse, data: unknown) {
  res.writeHead(200, { ...corsHeaders, 'content-type': 'application/json' });
  res.end(JSON.stringify(data));
}

function respondWithContract(res: ServerResponse) {
  res.writeHead(200, { ...corsHeaders, 'content-type': 'text/html' });
  res.end(serviceDocument);
}

const serviceDocument = `<html>
  <head>
    <meta charset="utf-8">
    <title>Fake-service document</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
    code.block {
      padding: 0.5rem 1rem;
      display: block;
      border: 1px solid black;
      background-color: #ccc;
      border-radius: 0.15rem;
    }
    </style>
  </head>
  <body>
    <h2>Endpoints</h2>
    <h3><code>/people</code></h3>
    <span>Returns a list of random people (contract: <a href="#person"><code>Person</code></a>).</span>
    <h2>Data contract</h2>
    <a href="#person">
      <h3><code>Person</code></h3>
    </a>
    <code class="block">
      firstName: string; <br>
      lastName: string; <br>
      age: number; <br>
      gender: string; <br>
      pets: string[]; <br>
    </code>

    <h2>Supported query syntax</h2>
    <h3>Filter</h3>
    <strong>Syntax</strong>
    <code class="block">$filter=PROPERTY_NAME1 (eq|contains) VALUE1[,PROPERTY_NAME2 (eq|contains) VALUE2]</code><br>
    <strong>Example</strong><br>
    Fetch the list of all people with last name 'Doe' and of 42 years of age.<br>
    <code class="block">/people?$filter=lastName contains 'Doe',age eq 42</code>

    <h3>Count</h3>
    <strong>Syntax</strong>
    <code class="block">$count=true</code><br>
    <strong>Example</strong><br>
    Fetch the count of all people in the list.<br>
    <code class="block">/people?$count=true</code><br>
    Fetch the count of all people with last name 'Doe' and of 42 years of age.<br>
    <code class="block">/people?$filter=lastName contains 'Doe' AND age eq 42&$count=true</code>

    <h3>Sorting</h3>
    <strong>Syntax</strong>
    <code class="block">$orderby=PROPERTY_NAME1[asc|desc][,PROPERTY_NAME2[asc|desc]]</code><br>
    <strong>Example</strong><br>
    Sort the list of people by age<br>
    <code class="block">/people?$orderby=age</code><br>
    Sort the list of all people with last name 'Doe' with ascending by age and then descending by first name<br>
    <code class="block">/people?$filter=lastName contains 'Doe'&$orderby=age,firstName desc</code>

    <h3>Paging</h3>
    <strong>Syntax</strong>
    <code class="block">$skip=OFFSET&$top=CHUNK_SIZE</code><br>
    <strong>Example</strong><br>
    Fetch the first page (page size: 50)<br>
    <code class="block">
    /people?$top=50<br>
    /people?$top=50&$skip=0</code><br>
    Fetch the second page (page size: 50)<br>
    <code class="block">/people?$top=50&$skip=50</code><br>
  </body>
</html>`;