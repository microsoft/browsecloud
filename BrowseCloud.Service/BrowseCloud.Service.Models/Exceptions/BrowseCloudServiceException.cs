// <copyright file="BrowseCloudServiceException.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Models.Exceptions
{
    using System;

    /// <summary>
    /// Generic server error, with a message that we should expose to the user.
    /// </summary>
    public class BrowseCloudServiceException : Exception
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="BrowseCloudServiceException"/> class.
        /// Generic server error, with a message that we should expose to the user.
        /// </summary>
        public BrowseCloudServiceException()
        {
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="BrowseCloudServiceException"/> class.
        /// Generic server error, with a message that we should expose to the user.
        /// </summary>
        /// <param name="message">Exception Message</param>
        public BrowseCloudServiceException(string message)
            : base(message)
        {
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="BrowseCloudServiceException"/> class.
        /// Generic server error, with a message that we should expose to the user.
        /// </summary>
        /// <param name="message">Exception Message</param>
        /// <param name="inner">Inner Exception</param>
        public BrowseCloudServiceException(string message, Exception inner)
            : base(message, inner)
        {
        }
    }
}
