function fetchNotifications() {
    console.log('Fetching notifications...');
    fetch('/notifications/user')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Notifications received:', data);
            console.log('User role:', document.body.dataset.userRole);
            console.log('User ID:', document.body.dataset.userId);
            updateNotificationDropdown(data.unread, data.read);
        })
        .catch(error => {
            console.error('Error fetching notifications:', error);
        });
}

function updateNotificationDropdown(unreadNotifications, readNotifications) {
    const $notificationList = $('#notificationList');
    const $notificationCount = $('#notificationCount');

    $notificationList.empty();
    $notificationCount.text(unreadNotifications.length);

    if (unreadNotifications.length === 0 && readNotifications.length === 0) {
        $notificationList.append('<a class="dropdown-item" href="#">No notifications</a>');
    } else {
        if (unreadNotifications.length > 0) {
            $notificationList.append('<h6 class="dropdown-header">Unread Notifications</h6>');
            unreadNotifications.forEach(notification => {
                appendNotificationItem($notificationList, notification, true);
            });
        }

        if (readNotifications.length > 0) {
            $notificationList.append('<h6 class="dropdown-header">Read Notifications</h6>');
            readNotifications.slice(0, 5).forEach(notification => {
                appendNotificationItem($notificationList, notification, false);
            });
            if (readNotifications.length > 5) {
                $notificationList.append('<a class="dropdown-item text-primary" href="/notifications/history">View all notifications</a>');
            }
        }
    }
}

function appendNotificationItem($notificationList, notification, isUnread) {
    const $notificationItem = $('<a>')
        .addClass('dropdown-item')
        .attr('href', '#')
        .text(notification.message);

    if (isUnread) {
        $notificationItem.addClass('font-weight-bold');
    }

    $notificationItem.on('click', (e) => {
        e.preventDefault();
        handleNotificationClick(notification);
    });

    $notificationList.append($notificationItem);
}

function handleNotificationClick(notification) {
    markNotificationAsRead(notification.id);
    
    switch (notification.type) {
        case 'new_assessment':
            window.location.href = `/headteacher/assessment/${notification.assessmentId}`;
            break;
        case 'assessment_approved':
            window.location.href = `/teacher/assessment/view/${notification.assessmentId}`;
            break;
        case 'assessment_changes_requested':
        case 'assessment_change_request':
            window.location.href = `/teacher/assessment/edit/${notification.assessmentId}`;
            break;
        default:
            console.log('Unknown notification type:', notification.type);
    }
}

function markNotificationAsRead(notificationId) {
    fetch(`/notifications/mark-read/${notificationId}`, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Notification marked as read:', notificationId);
                updateNotificationCount();
            }
        })
        .catch(error => {
            console.error('Error marking notification as read:', error);
        });
}

function updateNotificationCount() {
    const $notificationCount = $('#notificationCount');
    const currentCount = parseInt($notificationCount.text());
    if (currentCount > 0) {
        $notificationCount.text(currentCount - 1);
    }
}

function logNotifications(notifications) {
    console.log('Received notifications:', notifications);
}

$(document).ready(function() {
    fetchNotifications();
    setInterval(fetchNotifications, 30000); // Fetch notifications every 30 seconds

    // Initialize Bootstrap dropdown
    $('.dropdown-toggle').dropdown();
});