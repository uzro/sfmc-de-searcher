const button = document.getElementById("refreshde");
const content = document.getElementById("content");
const dename_input = document.getElementById("dename");
const debutton = document.getElementById("desubmit");
const demsg = document.getElementById("output");
const dea = document.getElementById("dea");
const denum = document.getElementById("denum");
const detime = document.getElementById("detime");
const dePanel = document.getElementById("de-panel");
const inputClear = document.getElementById("inputClear");


// checkLogin();

let MainData = {};
const MainDataLocal = localStorage.getItem("MainDataObj");
if (MainDataLocal) {
  MainData = JSON.parse(MainDataLocal);
  denum.textContent = `${Object.keys(MainData).length} DE`;

  const MainDataObjUpdatetime = localStorage.getItem("MainDataObjUpdatetime");
  detime.textContent = MainDataObjUpdatetime;

  const lastDESearchResultList = localStorage.getItem("lastDESearchResultList");
  if (lastDESearchResultList) {
    const lastDESearch = localStorage.getItem("lastDESearch");
    dename_input.value = lastDESearch;
    const matchList = createMatchListDom(JSON.parse(lastDESearchResultList), lastDESearch);
    dePanel.appendChild(matchList);
  }
}


inputClear.addEventListener("click", () => {
  dename_input.value = "";
  demsg.textContent = "";
  dePanel.innerHTML = "";
  localStorage.removeItem("lastDESearch");
  localStorage.removeItem("lastDESearchResultList");
});

debutton.addEventListener("click", () => {
  demsg.textContent = "";
  dePanel.innerHTML = "";

  let dename = dename_input.value.trim();
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    let urlItem = getDomainAndInstanceId(currentTab.url);
    let urlDomain = urlItem[0];
    let urlServer = getServer(urlDomain);

    const matchedItems = [];
    for (let key in MainData) {
      if (key.includes(dename.toLowerCase())) {
        matchedItems.push(MainData[key]);
      }
    }

    const sortedItems = matchedItems.sort((a, b) => a.name.length - b.name.length);
    sortedItems.map((item) => {
      item.href = `https://mc.${urlServer}.marketingcloudapps.com/contactsmeta/admin.html#admin/data-extension/${item.id}`;
      }
    );

    if (sortedItems.length > 0) {
      localStorage.setItem("lastDESearch", dename);
      localStorage.setItem("lastDESearchResultList", JSON.stringify(sortedItems)); 
    }

    dePanel.appendChild(createMatchListDom(sortedItems, dename));
  });
});

button.addEventListener("click", () => {
  MainData = {};
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    if (!currentTab.url) {
      return;
    }
    let urlItem = getDomainAndInstanceId(currentTab.url);
    let urlDomain = urlItem[0]; // mc.s*.marketingcloudapps.com
    let urlServer = getServer(urlDomain);
    let api = makeDEAPi(urlServer);

    console.log(api);

    fetch(api)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then(function (data) {
        console.log(data);
        let entry = data.entry;
        let entry_res = null;
        for (let item of entry) {
          if (item.type === "dataextension") {
            entry_res = item;
          }
        }
        let root_id = entry_res.id;
        console.log(entry_res);
        getDeByFid(root_id, urlServer, "/");
        getChildernByFid(root_id, urlServer, "/");
      }).catch((error) => {
        const needLogingDiv = document.createElement("div");
        needLogingDiv.className = "alert-item";
        needLogingDiv.textContent = "Please Check Your Login Status";
        content.innerHTML = "";
        content.appendChild(needLogingDiv);
        console.log("refresh error", error);
      });
  });
});


function createMatchListDom(items, searchKey) {
  const matchListDom = document.createElement("div");
  matchListDom.className = "match-list";
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const matchItem = document.createElement("div");
    matchItem.className = "match-item";
    const matchLink = document.createElement("a");
    matchLink.target = "_blank";
    matchLink.href = item.href;
    // highlight search key
    if (searchKey) {
      const searchKeyIndex = item.name.toLowerCase().indexOf(searchKey.toLowerCase());
      if (searchKeyIndex >= 0) {
        const before = item.name.slice(0, searchKeyIndex);
        const after = item.name.slice(searchKeyIndex + searchKey.length);
        const matchedKey = item.name.slice(searchKeyIndex, searchKeyIndex + searchKey.length);
        matchLink.innerHTML = `${i + 1}. ${item.folder}${before}<span class="highlight-keyword">${matchedKey}</span>${after}`;
      }
      console.log('here search', item.name);
    } else {
      matchLink.textContent = `${i + 1}. ${item.folder}${item.name}`;
    }

    matchItem.appendChild(matchLink);
    matchListDom.appendChild(matchItem);
  }

  if (items.length === 0) {
    const noMatchItem = document.createElement("div");
    noMatchItem.className = "no-match-item";
    noMatchItem.textContent = "No match found";
    matchListDom.appendChild(noMatchItem);
  }

  return matchListDom;
}

function getDeByFid(fid, server, father) {
  let api = `https://mc.${server}.marketingcloudapps.com/contactsmeta/fuelapi/data-internal/v1/customobjects/category/${fid}?retrievalType=1&$page=1&$pagesize=200&$orderBy=Name%20ASC&`;
  fetch(api)
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      for (let item of data.items) {
        MainData[item.name.toLowerCase()] = {
          folder: `${father}`,
          id: item.id,
          name: item.name,
        };
      }
      console.log(MainData);
      denum.textContent = `${Object.keys(MainData).length} DE`;

      const now = `${getCurrentDateTime()}`;
      detime.textContent = now;
      localStorage.setItem("MainDataObj", JSON.stringify(MainData));
      localStorage.setItem("MainDataObjUpdatetime", now);
    });
}

function getChildernByFid(fid, server, father) {
  let api = `https://mc.${server}.marketingcloudapps.com/contactsmeta/fuelapi/legacy/v1/beta/folder/${fid}/children?Localization=true&$top=1000`;
  fetch(api)
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      for (let item of data.entry) {
        let children_id = item.id;
        let children = item.name;
        let newname = `${father}${children}/`;
        getDeByFid(children_id, server, newname);
        getChildernByFid(children_id, server, newname);
      }
    });
}

function getServer(url) {
  var match = url.match(/s\d+/i);
  var sValue = "s12";

  if (match) {
    sValue = match[0];
  }
  return sValue;
}

function makeDEAPi(server) {
  return `https://mc.${server}.marketingcloudapps.com/contactsmeta/fuelapi/legacy/v1/beta/folder?$where=allowedtypes%20in%20(%27synchronizeddataextension%27,%20%27dataextension%27,%27shared_data%27)&Localization=true&`;
}

function makeDEApiByName(server) {
  return `https://spf.${server}.marketingcloudapps.com/proxy/data/v1/dataextensions/query`;
}

function getDEKey(api, dename) {
  let formbody = {
    query: {
      property: "name",
      simpleOperator: "like",
      value: dename,
    },
    fields: ["Name", "CreatedDate", "ModifiedDate", "ObjectID", "CustomerKey"],
  };

  fetch(api, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formbody),
  })
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      console.log(data);
    });
}

function formatData(data) {
  let res = [];
  let processes = sortByKey(data.processes, "sequence");
  let index = 0;
  for (item of processes) {
    index += 1;
    let workers = sortByKey(item.workers);
    let index2 = 0;
    for (worker of workers) {
      index2 += 1;
      worker.index = `${index}.${index2}`;
    }
    res.push(worker);
  }
  console.log(res);
  return res;
}

function getDomainAndInstanceId(url) {
  const parsedUrl = new URL(url);
  const domainParts = parsedUrl.hostname.split(".");
  const domain = domainParts.join(".");
  const instanceId = parsedUrl.hash.slice(9).split("/")[1];
  return [domain, instanceId];
}

function renderList(domId, list) {
  const container = document.getElementById(domId);
  container.innerHTML = "";

  const div = document.createElement("div");
  for (const { name, index } of list) {
    const itemDiv = document.createElement("div");
    itemDiv.textContent = `${index} ${name}`;
    div.appendChild(itemDiv);
  }
  container.appendChild(div);
}

function sortByKey(array, key) {
  return array.sort((a, b) => a[key] - b[key]);
}

function getCurrentDateTime() {
  var now = new Date();
  var year = now.getFullYear().toString().slice(-2);
  var month = (now.getMonth() + 1).toString().padStart(2, "0");
  var day = now.getDate().toString().padStart(2, "0");
  var hours = now.getHours().toString().padStart(2, "0");
  var minutes = now.getMinutes().toString().padStart(2, "0");

  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

function checkLogin() {
  function _checkStatus() {
    // TODO: check login token expired or not
    return true;
  }

  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    for (let tab of tabs) {
      const url = tab.url;
      if (!url || !url.includes) {
        continue;
      }
      // console.log(tab)
      if (
        (url.includes("exacttarget.com") ||
          url.includes("marketingcloudapps")) &&
        !url.includes("/login?")
      ) {
        console.log("login");
        return true;
      }
    }

    const needLogingDiv = document.createElement("div");
    needLogingDiv.className = "alert-item";
    needLogingDiv.textContent = "Please login to Marketing Cloud first";

    if (!_checkStatus()) {
      needLogingDiv.textContent = "Login expired, please login again";
    }
    content.innerHTML = "";
    content.appendChild(needLogingDiv);

    button.disabled = true;

    return false;
  });
}
