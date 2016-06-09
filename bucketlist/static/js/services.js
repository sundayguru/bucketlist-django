angular.module('bucketlist.services', [])

.factory('StorageService', function() {
    return {
        setItem: function(key, value) {
            window.localStorage.setItem(key, value);
        },
        storeObject: function(key, value) {
            window.localStorage.setItem(key, angular.toJson(value));
        },
        getObject: function(key, value) {
            var result = window.localStorage.getItem(key);
            return result ? angular.fromJson(result) : {};
        },
        getItem: function(key) {
            return window.localStorage.getItem(key);
        },
        removeItem: function(key) {
            window.localStorage.removeItem(key);
        }
    };
})

.factory('HttpService', function($http, StorageService, CONFIG, Util) {

        return {
            send: function(endpoint, method, data, successCallback, errorCallback) {
                var url = endpoint.indexOf('http') == 0 ? endpoint : CONFIG.apiUrl + endpoint;
                $http.defaults.headers.common['Authorization'] = 'DBL ' + StorageService.getItem('token');
                $http({
                    method: method,
                    url: url,
                    data: data
                }).then(successCallback, errorCallback);
            },
            get: function(endpoint, successCallback, errorCallback) {
                this.send(endpoint, 'GET', null, successCallback, errorCallback)
            },
            post: function(endpoint, data, successCallback, errorCallback) {
                this.send(endpoint, 'POST', data, successCallback, errorCallback)
            },
            update: function(endpoint, data, successCallback, errorCallback) {
                this.send(endpoint, 'PUT', data, successCallback, errorCallback)
            },
            delete: function(endpoint, successCallback, errorCallback) {
                this.send(endpoint, 'DELETE', null, successCallback, errorCallback)
            },

        };

    })
    .factory('AuthService', function(Util, HttpService, StorageService) {
        return {
            refreshToken: function() {
                data = { token: Util.getToken() };
                HttpService.post('/auth/token/refresh/', data, function(response) {
                    if (response.data.token) {
                        StorageService.setItem('token', response.data.token)
                    }
                }, function(response) {
                    Util.logout(response);
                });
            }
        }
    })

.factory('BucketlistService', function(StorageService, Util, HttpService, AuthService, CONFIG) {
    return {
        get: function(url, $scope) {
            Util.toast('Fetching Bucketlists')
            HttpService.get(url, function(response) {

                if (response.data.results && response.data.results.length) {
                    $scope.activeId = response.data.results[0].id;
                    $scope.total = response.data.count;
                    $scope.bucketlists = response.data.results;
                    $scope.next = response.data.next;
                    $scope.previous = response.data.previous;
                    Util.broadcast(response.data.results[0].id, response.data.results[0].name)
                    AuthService.refreshToken();

                }else{
                    $scope.bucketlists = [];
                    $scope.total = 0;
                    Util.broadcast(0, '')
                }
                Util.toast('done!')
            }, function(response) {
                if(response.status != 404)
                    Util.logout(response);
            });
        },
        save: function($scope) {
            Util.toast('Saving Bucketlist')
            var func = 'post';
            var path = '/bucketlists/';
            if ($scope.bucketlist.date_created) {
                func = 'update'
                path += $scope.bucketlist.id + '/';
            }
            HttpService[func](path, $scope.bucketlist, function(response) {
                $scope.bucketlist = {};
                $scope.toggleBucketListForm();
                Util.toast('done!')
                $scope.getBucketlist('/bucketlists/');
            }, function(response) {
                if(response.status != 404)
                    Util.logout(response);
            });
        },
        delete: function(bucketlist_id, $scope) {
            Util.toast('Deleting Bucketlist')
            HttpService.delete('/bucketlists/' + bucketlist_id, function(response) {
                if (response.status === 204) {
                    Util.toast('done!')
                    $scope.getBucketlist('/bucketlists/');
                }
            }, function(response) {
                if(response.status != 404)
                    Util.logout(response);
            });
        }
    };
})

.factory('BucketlistItemService', function(StorageService, Util, HttpService, AuthService) {
    return {
        get: function(url, $scope) {
            Util.toast('Fetching Bucketlist items')
            HttpService.get(url, function(response) {
                if (response.data.results) {
                    $scope.total = response.data.count;
                    $scope.items = response.data.results;
                    $scope.next = response.data.next;
                    $scope.previous = response.data.previous;
                    AuthService.refreshToken();
                }else{
                    $scope.items = [];
                    $scope.total = 0;
                }
                Util.toast('done!')
            }, function(response) {
                if(response.status != 404)
                    Util.logout(response);
            });
        },
        save: function($scope, toggle) {
            Util.toast('Saving Bucketlist item')
            var func = 'post';
            var path = '/bucketlists/' + $scope.bucketlist_id + '/items/';
            if ($scope.item.date_created) {
                func = 'update'
                path += $scope.item.id + '/';
            }
            HttpService[func](path, $scope.item, function(response) {
                $scope.item = {};
                if(toggle){
                  $scope.toggleRight();
                }
                Util.broadcast($scope.bucketlist_id, $scope.bucketlist_name)
            }, function(response) {
                if(response.status != 404)
                    Util.logout(response);
            });
        },
        delete: function($scope) {
            Util.toast('Deleting Bucketlist item')
            HttpService.delete('/bucketlists/' + $scope.bucketlist_id + '/items/' + $scope.item.id, function(response) {
                if (response.status === 204) {
                    Util.toast('done!')
                    $scope.getItems('/bucketlists/' + $scope.bucketlist_id + '/items/');
                    $scope.item = {};
                }
            }, function(response) {
                if(response.status != 404)
                    Util.logout(response);
            });
        }
    };
})

.factory('Util', function($mdToast, StorageService, $rootScope, CONFIG) {
    Util = {
        toast: function(message) {
            $mdToast.show(
                $mdToast.simple()
                .textContent(message)
                .position('top right')
                .hideDelay(3000)
            );
        },
        getToken: function() {
            return StorageService.getItem('token');
        },
        broadcast: function(bucketlist_id, bucketlist_name) {
            $rootScope.$broadcast(
                CONFIG.loadItemsEvent, {
                    bucketlist_id: bucketlist_id,
                    bucketlist_name: bucketlist_name
                }
            );
        },
        logout: function(response) {
            if ((response && response.status) || !response) {
                document.location.href = '/logout';
            }
        }
    };
    return Util;

});
