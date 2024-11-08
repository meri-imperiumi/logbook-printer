import fetch from 'node-fetch';
import { Bonjour } from 'bonjour-service';

let clientStatus = {};

export function setStatus(status) {
  clientStatus = status;
}

export function getStatus(status) {
  return clientStatus;
}

export function discover() {
  const bonjour = new Bonjour();
  return new Promise((resolve, reject) => {
    bonjour.find({
      type: 'signalk-http',
    }, (service) => {
      if (!service || !service.host) {
        reject(new Error('No service found'));
        return;
      }
      resolve(service);
    });
  });
}

export function authenticate(skHost, clientId, clientDesc) {
  if (clientStatus.accessToken) {
    // We already have token, can continue
    // TODO: Verify that token is still valid and has "admin" privs
    return Promise.resolve();
  }
  if (!clientStatus.accessRequest) {
    console.log('Requesting Signak K access token');
    const url = `http://${skHost}/signalk/v1/access/requests`;
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId,
        description: clientDesc,
      }),
    })
      .then((res) => res.json())
      .then((accessRequest) => {
        clientStatus.accessRequest = accessRequest.href;
        return Promise.reject(new Error('Access token requested, please approve via Signal K admin interface'));
      });
  }
  console.log('Checking Signal K access status');
  const url = `http://${skHost}${clientStatus.accessRequest}`;
  return fetch(url)
    .then((res) => res.json())
    .then((requestStatus) => {
      if (requestStatus.state === 'PENDING') {
        return Promise.reject(new Error('Access token request is pending, please approve via Signal K admin interface'));
      }
      if (requestStatus.state !== 'COMPLETED') {
        return Promise.reject(new Error(`Unknown request state ${requestStatus.state}`));
      }
      if (requestStatus.statusCode !== 200) {
        delete clientStatus.accessRequest;
        return Promise.reject(new Error(`Access request failed with code ${requestStatus.statusCode}`));
      }
      if (requestStatus.accessRequest.permission === 'DENIED') {
        delete clientStatus.accessRequest;
        return Promise.reject(new Error('Access request has been denied in Signal K'));

      }
      delete clientStatus.accessRequest;
      clientStatus.accessToken = requestStatus.accessRequest.token;
      return Promise.resolve();
    });
}

export function request(url, headers = {}) {
  const options = {
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      Authorization: `JWT ${clientStatus.accessToken}`,
    },
  };
  return fetch(url, options)
    .then((res) => {
      if (!res.ok) {
        return res.text()
          .then((text) =>  {
            throw new Error(`Request failed with ${res.status}: ${text}`);
          });
      }
      return res.json();
    });
}
