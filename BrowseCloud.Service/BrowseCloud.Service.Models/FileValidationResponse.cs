// <copyright file="FileValidationResponse.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Models
{
    using System.Runtime.Serialization;

    /// <summary>
    /// If a document text is valid and helper text.
    /// </summary>
    [DataContract]
    public class FileValidationResponse
    {
        /// <summary>
        /// If the document is valid.
        /// </summary>
        [DataMember(Name = "isValid")]
        public bool IsValid { get; set; }

        /// <summary>
        /// The validation message.
        /// </summary>
        [DataMember(Name = "message")]
        public string Message { get; set; }
    }
}
