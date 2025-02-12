import { BACKEND_PORT } from './config.js';
// A helper you may want to use when uploading new images to the server.
import { fileToDataUrl } from './helpers.js';


let token = null;
let userId = null;
let channelIdCurrentView = null;
let pageStart = 0;


//Warning upload photo works but is slow if the photo is large please wait if checking
// please re click button aka "hide" when finished using that feature
const makeRequest = (route, method, body) => {
    return new Promise((resolve, reject) => {
        const options = { 
            method: method ,
            headers: { 
                'Content-type' : 'application/json',
                'Authorization' : 'Bearer ' + token
            },
        };
        if (body !== undefined) { 
            options.body = JSON.stringify(body);
        }
        fetch('http://localhost:5005' + route, options).then((rawDataResponse) => { 
            return rawDataResponse.json();
        }).then((data) => {
            if (data.error) { 
                errorModal(data.error);
            } else {
                resolve(data);
            }
        });
    });
}
document.getElementById('register-action').addEventListener('click', () =>  {
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const name = document.getElementById('register-name').value;
    
    makeRequest('/auth/register', 'POST', {
        email: email,
        password: password,
        name: name
    }).then ((data) => {
        token = data.token;
        userId = data.userId;
        login();
        ;
    });
});

document.getElementById('login-action').addEventListener('click', () =>  {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    makeRequest('/auth/login', 'POST', {
        email: email,
        password: password,
    }).then ((data) => {
        token = data.token;
        userId = data.userId;
        login();
        ;
    });;
});

document.getElementById('msgsend-action').addEventListener('click', () =>  {
    const msg = document.getElementById('msgsend-text').value;
    // https://stackoverflow.com/questions/6623231/remove-all-white-spaces-from-text
    const checkWhiteSpace = msg.replace(/ /g,'');
    if (msg === '' || checkWhiteSpace === '') { 
        errorModal('the message is empty please enter a valid message');
    } else {
        makeRequest('/message/' + channelIdCurrentView, 'POST', {
            message: msg,
        }).then ((data) => {
            displayChannel(channelIdCurrentView);
        });
    }
});

const displayChannel = (id) => {
    document.getElementById('channels-list').classList.add('hide');
    document.getElementById('channel-messages').classList.remove('hide');
    document.getElementById('channel-messages-body').remove();
    document.getElementById('next-previous').classList.remove('hide');

    const channelMessagesBody = document.createElement('div');
    channelMessagesBody.setAttribute('id', 'channel-messages-body');
    document.getElementById('channel-messages').appendChild(channelMessagesBody);
    channelContent(id, pageStart);
    channelIdCurrentView = id;
}
document.getElementById('next-button').addEventListener('click', () => {
    pageStart = pageStart + 25;
    displayChannel(channelIdCurrentView);
});
document.getElementById('prev-button').addEventListener('click', () => {
    pageStart = pageStart - 25;
    if (pageStart < 0) { 
        pageStart = 0;
    }
    displayChannel(channelIdCurrentView);
});

function channelContent(id, page) { 
    makeRequest('/message/' + id + '?start=' + page, 'GET').then((data) => {
        document.getElementById('pinned-messages').innerText = "";
        for (const messageObj of data.messages){
            getDetailsOfUser(messageObj.sender).then((user) => {
                const messageDiv = document.createElement('div');
                const profileImage = document.createElement('img');
                // profileImage.src = './src/defaultProfileImage.png';
                if (user.image === null || user.image === undefined) {
                    profileImage.src = './src/defaultProfileImage.png';
                    user.image = './src/defaultProfileImage.png';
                    profileImage.alt = 'showing default profile image';
                } else { 
                    profileImage.src = user.image;
                    profileImage.alt = 'user profile image'
                }
                let dateOfMessage;
                if (messageObj.editedAt === null) { 
                    dateOfMessage = new Date(messageObj.sentAt).toUTCString();
                } else { 
                    dateOfMessage = new Date(messageObj.editedAt).toUTCString();
                }

                const nameLink = document.createElement('div');
                const profileImageLink = document.createElement('img');
                profileImageLink.src = user.image;
                nameLink.classList.add('hoverState');
                nameLink.innerText = 'Name: ' + user.name + '\n';
                nameLink.addEventListener('click', () => {
                    userProfileModal(user.name, user.bio, user.email, profileImageLink);
                    
                });
                document.getElementById('channel-messages-body').appendChild(profileImage);
                document.getElementById("channel-messages-body").appendChild(nameLink);
                messageDiv.innerText = 'Message: ' + messageObj.message + '\n' + 'Date: ' + dateOfMessage;
                if (messageObj.editedAt !== null) { 
                    messageDiv.innerText = 'Message: ' + messageObj.message + '\nthis message has been edited\n'  + '\n' + 'Date: ' + dateOfMessage;
                }
                document.getElementById('channel-messages-body').appendChild(messageDiv);

                if (messageObj.sender === userId) {
                    const deleteMsgButton = document.createElement('button');
                    deleteMsgButton.innerText = 'Delete Message';
                    deleteMsgButton.addEventListener('click', () => {
                        deleteMessage(messageObj.id);
                    });
                    document.getElementById('channel-messages-body').appendChild(deleteMsgButton);
    
                    const editMsgButton = document.createElement('button');
                    
                    const editMsgInput = document.createElement('input');
                    editMsgInput.setAttribute("type", "text");
                    const editMsgSubmit = document.createElement('button');
                    editMsgSubmit.innerText = 'Submit';
                    editMsgInput.classList.add('hide');
                    editMsgSubmit.classList.add('hide');
                    editMsgButton.innerText = 'Edit Message';
                    editMsgButton.addEventListener('click', () => {
                        editMsgInput.classList.remove('hide');
                        editMsgSubmit.classList.remove('hide');
                    });
                    editMsgSubmit.addEventListener('click', () => { 
                        editMessage(messageObj.id, editMsgInput.value, messageObj.message);
                        if (editMsgInput.value !== messageObj.message) { 
                            messageObj.edited = true;
                        }
                    });
                    document.getElementById('channel-messages-body').appendChild(editMsgButton);
                    document.getElementById('channel-messages-body').appendChild(document.createElement('br'));
                    document.getElementById('channel-messages-body').appendChild(editMsgInput);
                    document.getElementById('channel-messages-body').appendChild(editMsgSubmit);
                }
                if (messageObj.pinned === false) { 
                    const pinMsgButton = document.createElement('button');
                    pinMsgButton.innerText = 'Pin Message';
                    pinMsgButton.addEventListener('click', () => { 
                        pinMessage(messageObj.id, pinnedMessageDiv);
                    });
                    document.getElementById('channel-messages-body').appendChild(pinMsgButton);
                } else {
                    const unPinMsgButton = document.createElement('button');
                    unPinMsgButton.innerText = 'Unpin Message';
                    unPinMsgButton.addEventListener('click', () => { 
                        unPinMessage(messageObj.id);
                    });
                    document.getElementById('channel-messages-body').appendChild(unPinMsgButton);
                }
                // this is ok tutor from forums
                //https://edstem.org/au/courses/9853/discussion/1083988
                const thumbsUp = String.fromCodePoint(0x1F44D);
                const thumbsUpEmoji = document.createElement('button');
                thumbsUpEmoji.innerText = thumbsUp;
                thumbsUpEmoji.addEventListener('click', () => {
                    react(messageObj.id, thumbsUp);
                });
                document.getElementById('channel-messages-body').appendChild(thumbsUpEmoji);
    
                const thumbsDown = String.fromCodePoint(0x1F44E);
                const thumbsDownEmoji = document.createElement('button');
                thumbsDownEmoji.innerText = thumbsDown;
                thumbsDownEmoji.addEventListener('click', () => {
                    react(messageObj.id, thumbsDown);
                });
                document.getElementById('channel-messages-body').appendChild(thumbsDownEmoji);
    
                const laughing = String.fromCodePoint(0x1F923);
                const laughingEmoji = document.createElement('button');
                laughingEmoji.innerText = laughing;
                laughingEmoji.addEventListener('click', () => {
                    react(messageObj.id, laughing);
                });
                document.getElementById('channel-messages-body').appendChild(laughingEmoji);
    

                
                const nameLinkPinned = document.createElement('div');
                const profileImagePinnedViewing = document.createElement('img');
                profileImagePinnedViewing.src = user.image;
                nameLinkPinned.classList.add('hoverState');
                nameLinkPinned.innerText = 'Name: ' + user.name + '\n';
                nameLinkPinned.addEventListener('click', () => {
                    userProfileModal(user.name, user.bio, user.email, profileImagePinnedViewing);
                    
                });
                const pinnedMessageDiv = document.createElement('div');
                pinnedMessageDiv.innerText = 'Message: ' + messageObj.message + '\n' + 'Date: ' + dateOfMessage;
                if (messageObj.editedAt !== null) { 
                    pinnedMessageDiv.innerText = 'Message: ' + messageObj.message + '\nthis message has been edited\n'  + '\n' + 'Date: ' + dateOfMessage;
                }
                const profileImagePinned = document.createElement('img');
                profileImagePinned.src = user.image;
                if (messageObj.pinned) {
                    document.getElementById('pinned-messages').appendChild(profileImagePinned);
                    document.getElementById("pinned-messages").appendChild(nameLinkPinned);
                    document.getElementById('pinned-messages').appendChild(pinnedMessageDiv);
                    document.getElementById('pinned-messages').appendChild(document.createElement('hr'));
                    
                }
                document.getElementById('channel-messages-body').appendChild(document.createElement('hr'));
            });
        }

    });
}

function react(messageId, reactString) { 
    makeRequest('/message/react/' + channelIdCurrentView + '/' + messageId, 'POST', {
        react: reactString,
    }).then ((data) => {
        displayChannel(channelIdCurrentView);
    });
}

function pinMessage(messageId) { 
    makeRequest('/message/pin/' + channelIdCurrentView + '/' + messageId, 'POST', {
    }).then ((data) => {
        displayChannel(channelIdCurrentView);
    });
}
function unPinMessage(messageId) { 
    makeRequest('/message/unpin/' + channelIdCurrentView + '/' + messageId, 'POST', {
    }).then ((data) => {
        displayChannel(channelIdCurrentView);
    });
}
function deleteMessage(messageId) { 
    makeRequest('/message/' + channelIdCurrentView + '/' + messageId, 'DELETE', {
    }).then ((data) => {
        displayChannel(channelIdCurrentView);
    });
}

function editMessage(messageId, newMessage, oldMessage) { 
    if (newMessage === oldMessage) { 
        errorModal('cannot edit a message to the same exisiting message');
    } else { 
        makeRequest('/message/' + channelIdCurrentView + '/' + messageId, 'PUT', {
            message: newMessage,
        }).then ((data) => {
            displayChannel(channelIdCurrentView);
        });
    }
    
}   

const displayChannels = () => {
    document.getElementById("channels-list").innerText = "";
    
    makeRequest('/channel', 'GET').then((data) => {
        document.getElementById('channel-messages').classList.add('hide');
        for (const channel of data.channels) {
            const link = document.createElement('div');
            link.innerText = channel.name;
            link.classList.add('hoverState');
            if (channel.members.includes(userId)) {
                if (channel.private) { 
                    link.classList.add('private');
                } else{ 
                    link.classList.add('public');
                }
                link.addEventListener('click', () => {
                    pageStart = 0;
                    displayChannel(channel.id);
                });
                document.getElementById("channels-list").appendChild(link);
            } else {
                if (!channel.private) {
                    link.classList.add('public');
                    const joinButton = document.createElement('button');
                    joinButton.innerText = 'Join';
                    joinButton.addEventListener('click', () => {
                        joinButton.classList.add('hide');
                        joinChannel(channel.id);
                    });
                    link.addEventListener('click', () => {
                        pageStart = 0;
                        displayChannel(channel.id);
                    });
                    document.getElementById("channels-list").appendChild(link);
                    document.getElementById("channels-list").appendChild(joinButton);
                }
            }
            document.getElementById('channels-list').appendChild(document.createElement('hr'));
            
        }
    });
};

function getDetailsOfUser(id) {
    return (
    makeRequest('/user/' + id, 'GET').then((res) => {
        return new Promise((resolve, reject) => { 
            resolve(res);
        });
    })
    );
}

function getAllUsers() {
    return (
    makeRequest('/user', 'GET').then((res) => {
        return new Promise((resolve, reject) => { 
            resolve(res);
        });
    })
    );
}

const joinChannel = (id) => { 
    makeRequest('/channel/' + id + '/join', 'POST', {
    }).then ((data) => {
        pageStart = 0;
    });
}

document.getElementById('logout-action').addEventListener('click', () =>  {
    makeRequest('/auth/logout', 'POST', {
    }).then ((data) => {
        logout();
    });
});

const logout = () => { 
    document.getElementById('logged-in').classList.add('hide');
    document.getElementById('logged-out').classList.remove('hide');
    pageStart = 0;
    token = null;
    userId = null;
}

const login = () => { 
    document.getElementById('logged-out').classList.add('hide');
    document.getElementById('logged-in').classList.remove('hide');
    displayChannels();
}

document.getElementById('nav-login').addEventListener('click', () => { 
    document.getElementById('register').classList.add('hide');
    document.getElementById('login').classList.remove('hide');
});

document.getElementById('nav-register').addEventListener('click', () => {
    document.getElementById('login').classList.add('hide');
    document.getElementById('register').classList.remove('hide');
});

document.getElementById('create-channel-form').addEventListener('click', () =>{ 
    if(document.getElementById('create-channel').classList.value === 'hide') { 
        document.getElementById('create-channel').classList.remove('hide');
    } else { 
        document.getElementById('create-channel').classList.add('hide');
    }
});

document.getElementById('user-profile').addEventListener('click', () => { 
    getDetailsOfUser(userId).then((user) => {
        document.getElementById('user-profile-name').placeholder = 'Current Name:  ' + user.name;
        document.getElementById('user-profile-bio').placeholder = 'Current Bio:  ' + user.bio;
        document.getElementById('user-profile-email').placeholder = 'Current Email:  ' + user.email;
        document.getElementById('change-view-password').addEventListener('click', () => {
            if (document.getElementById('user-profile-password').type === 'password') {
                document.getElementById('user-profile-password').type ='text';
            } else { 
                document.getElementById('user-profile-password').type ='password';
            }
        });
    });
    if(document.getElementById('view-user-profile').classList.value === 'hide') { 
        document.getElementById('view-user-profile').classList.remove('hide');
    } else { 
        document.getElementById('view-user-profile').classList.add('hide');
    }
});


document.getElementById('update-user-info').addEventListener('click', () => {
    const newName = document.getElementById('user-profile-name').value;
    const newBio = document.getElementById('user-profile-bio').value;
    const newEmail = document.getElementById('user-profile-email').value;
    const newPassword = document.getElementById('user-profile-password').value;
    
    if (newName === '' || newBio === '' || newEmail === '' || newPassword === '') { 
        errorModal('Please Fill In All Fields');
    } else { 
        makeRequest('/user', 'PUT', {
            email: newEmail,
            password: newPassword,
            name: newName,
            bio: newBio,
        }).then ((data) => {
            document.getElementById('user-profile-name').placeholder = "";
            document.getElementById('user-profile-bio').placeholder = "";
            document.getElementById('user-profile-email').placeholder = "";
            displayChannel(channelIdCurrentView);
        });
    }
    
});

//Warning !!!!!! this works but very slow and might lag computer
//please give it some time 
document.getElementById('upload-photo').addEventListener('click', () => {
    const photo = document.getElementById('photo-file').files[0];
    fileToDataUrl(photo).then((data) => {
        makeRequest('/user', 'PUT', {
            "image": data,
        }).then ((data) => {
            displayChannel(channelIdCurrentView)
        });
    });
});


// https://getbootstrap.com/docs/5.0/components/modal/
function errorModal(errorMessage) {
    const value = document.getElementById('error-popup');
    const modal = new bootstrap.Modal(value);
    modal.show();
    document.getElementById('error-message').innerText = errorMessage;
    document.getElementById('error-close').addEventListener('click' , () => {
        modal.hide();
    });
}

function userProfileModal(name, bio, email, profileImage) {
    const value = document.getElementById('user-details-popup');
    const modal = new bootstrap.Modal(value);
    modal.show();
    document.getElementById('user-details-message').innerText = "";
    document.getElementById("user-details-message").appendChild(profileImage);
    const displayName = document.createElement('div');
    displayName.innerText = 'Name: ' + name;
    const displayEmail = document.createElement('div');
    displayEmail.innerText = 'Bio: ' + bio;
    const displayBio = document.createElement('div');
    displayBio.innerText = 'Email: ' + email;
    document.getElementById("user-details-message").appendChild(displayName);
    document.getElementById("user-details-message").appendChild(displayEmail);
    document.getElementById("user-details-message").appendChild(displayBio);
    document.getElementById('user-details-close').addEventListener('click' , () => {
        modal.hide();
        document.getElementById('user-details-message').innerText = "";   
    });
}

// recursion to go through the whole list and wait until the last user of all the users is searched
// aka the end of the list
// this will allow me to make the users in order solution after much pain :( 
function recursionUserlist(currentIndex, list, idAndName, channelMembers) { 
    getDetailsOfUser(list[currentIndex].id).then((user) => {
        if (currentIndex == list.length - 1) {
            if (!channelMembers.includes(list[currentIndex].id)) { 
                idAndName.push({
                    name: user.name,
                    id: list[currentIndex].id
                });
            }
            
            idAndName.sort(sortList('name'));
            inviteUsers(idAndName); 
        } else { 
            if (!channelMembers.includes(list[currentIndex].id)) { 
                idAndName.push({
                    name: user.name,
                    id: list[currentIndex].id
                });
            }
            recursionUserlist(currentIndex + 1, list, idAndName, channelMembers);
        }
    });
}

function inviteUsers(inviteUsers) {
        document.getElementById("invite-users-message").innerText = "";
        const value = document.getElementById('invite-users-popup');
        const modal = new bootstrap.Modal(value);
        modal.show();
        for (const users of inviteUsers) { 
            createUserInviteCheckbox(users);
        }

        document.getElementById('invite-close').addEventListener('click' , () => {
            modal.hide();
        });
}

document.getElementById('invite-users').addEventListener('click' , () => {
    const usersToInvite = document.querySelectorAll('.checkbox');
    for (const user of usersToInvite) { 
        if (user.checked === true) { 
            const userStringToId = parseInt(user.id);
            makeRequest('/channel/' + channelIdCurrentView + '/invite', 'POST', {
                userId: userStringToId,
            }).then ((data) => {
                
            });
        }
    }

});
function createUserInviteCheckbox(user) { 
    const name = document.createElement('span');
    name.innerText = user.name;
    const checkbox = document.createElement('input');
    checkbox.type = "checkbox";
    checkbox.classList.add('form-check-input');
    checkbox.classList.add('checkbox');
    checkbox.name = user.name;
    checkbox.id = user.id;
    document.getElementById("invite-users-message").appendChild(name);
    document.getElementById("invite-users-message").appendChild(checkbox);
    document.getElementById("invite-users-message").appendChild(document.createElement('br'));
}
//https://ourcodeworld.com/articles/read/764/how-to-sort-alphabetically-an-array-of-objects-by-key-in-javascript
function sortList(idAndName) { 
    let sortOrder = 1;
    if(idAndName[0] === "-") {
        sortOrder = -1;
        idAndName = idAndName.substr(1);
    }
    return function (a,b) {
        if(sortOrder == -1){
            return b[idAndName].localeCompare(a[idAndName]);
        }else{
            return a[idAndName].localeCompare(b[idAndName]);
        }        
    }
}


document.getElementById('invite-users-to-channel-button').addEventListener('click', () => {
    getAllUsers().then((userList) => {
        makeRequest('/channel/' + channelIdCurrentView, 'GET').then((channel) => {
            let idAndName = [];
            recursionUserlist(0, userList.users, idAndName, channel.members);
            
        });
    });
});


document.getElementById('channels-show').addEventListener('click', () => {
    if(document.getElementById('channels-list').classList.value === 'hide') { 
        document.getElementById('channels-list').classList.remove('hide');
    } else { 
        document.getElementById('channels-list').classList.add('hide');
    }

});

document.getElementById('create-channel-button').addEventListener('click', () =>{ 
    const name = document.getElementById('new-channel-name').value;
    if (name === '') { 
        errorModal('please enter a valid name');
    }
    const permissionsText = document.getElementById('new-channel-permissions').value;
    let permissions;
    if (permissionsText === 'true') { 
        permissions = true;
    } else { 
        permissions = false;
    }
    let description = document.getElementById('new-channel-description').value;
    if (description === '') { 
        description = 'holdertext';
    }
    
    if (name === '') { 
        errorModal('please enter a valid name');
    } else { 
        makeRequest('/channel', 'POST', {
            name: name,
            private: permissions,
            description: description
        }).then ((data) => {
            const link = document.createElement('div');
            link.innerText = name;
            link.classList.add('hoverState')
            if (permissions) { 
                link.classList.add('private');
            } else{ 
                link.classList.add('public');
            }
            link.addEventListener('click', () => {
                displayChannel(data.channelId);
            });
            
            document.getElementById("channels-list").appendChild(link);
            
        });
    }
});

document.getElementById('leave-channel-button').addEventListener('click', () => { 
    makeRequest('/channel/' + channelIdCurrentView + '/leave', 'POST', {
    }).then ((data) => {
        displayChannels();
    });
});
document.getElementById('channel-details-button').addEventListener('click', () => {
    
    makeRequest('/channel/' + channelIdCurrentView, 'GET').then((data) => {
        const permissions = data.private;
        let permissionsText;
        if (permissions === false) { 
            permissionsText = 'Public';
        } else {
            permissionsText = 'Private';
        }
        document.getElementById('channel-name-details').innerText = data.name;
        document.getElementById('channel-description-details').innerText = data.description;
        document.getElementById('channel-permissions-details').innerText = permissionsText;
        document.getElementById('channel-creation-details').innerText = new Date(data.createdAt).toUTCString();
        
        getDetailsOfUser(data.creator).then((creatorName) => {
            document.getElementById('channel-creator-details').innerText = creatorName.name;
        });
    });
    if(document.getElementById('channel-details').classList.value === 'hide') { 
        document.getElementById('channel-details').classList.remove('hide');
    } else { 
        document.getElementById('channel-details').classList.add('hide');
    }   
});

document.getElementById('update-channel-details-submit').addEventListener('click', () => { 
    const name = document.getElementById('update-channel-name').value;
    const description = document.getElementById('update-channel-description').value;
    
    makeRequest('/channel/' + channelIdCurrentView, 'PUT', {
        name: name,
        description: description,
    }).then ((data) => {
        
    });
});

document.getElementById('update-channel-details-button').addEventListener('click', () => { 
    if(document.getElementById('update-channel-details').classList.value === 'hide') { 
        document.getElementById('update-channel-details').classList.remove('hide');
    } else { 
        document.getElementById('update-channel-details').classList.add('hide');
    }
});

document.getElementById('pinned-channel-messages-button').addEventListener('click', () => {
    if(document.getElementById('pinned-messages').classList.value === 'hide') { 
        document.getElementById('pinned-messages').classList.remove('hide');
    } else { 
        document.getElementById('pinned-messages').classList.add('hide');
    }
});

document.getElementById('toggle-mode').addEventListener('click', () => {
    const mode = document.body;
    mode.classList.toggle('dark-mode');
});

//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/fromCodePoint