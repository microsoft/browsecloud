// <copyright file="BrowseCloudPermissionsDeniedException.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Models.Exceptions
{
    using System;

    /// <summary>
    /// When a user does not have permission to access a document or job or other resource.
    /// </summary>
    public class BrowseCloudPermissionsDeniedException : BrowseCloudServiceException
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="BrowseCloudPermissionsDeniedException"/> class.
        /// When a user does not have permission to access a document or job or other resource.
        /// </summary>
        public BrowseCloudPermissionsDeniedException()
        {
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="BrowseCloudPermissionsDeniedException"/> class.
        /// When a user does not have permission to access a document or job or other resource.
        /// </summary>
        /// <param name="message">Exception Message</param>
        public BrowseCloudPermissionsDeniedException(string message)
            : base(message)
        {
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="BrowseCloudPermissionsDeniedException"/> class.
        /// When a user does not have permission to access a document or job or other resource.
        /// </summary>
        /// <param name="message">Exception Message</param>
        /// <param name="inner">Inner Exception</param>
        public BrowseCloudPermissionsDeniedException(string message, Exception inner)
            : base(message, inner)
        {
        }
    }
}
