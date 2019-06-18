// <copyright file="Document.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Models
{
    using System;
    using System.Collections.Generic;
    using System.Runtime.Serialization;
    using BrowseCloud.Service.Models.Exceptions;

    /// <summary>
    /// The type of input for the CountingGrid script.
    /// </summary>
    public enum InputType
    {
        /// <summary>
        /// Traditional Input - Expecting a titled csv with a set of titles. See docs.
        /// </summary>
        MetadataInput,

        /// <summary>
        /// Simple Input - Expecting a flexible CSV or TSV input. See docs.
        /// </summary>
        SimpleInput,
    }

    /// <summary>
    /// Document entity. Represents the text to train on.
    /// </summary>
    [DataContract]
    public class Document
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="Document"/> class.
        /// </summary>
        public Document()
        {
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="Document"/> class.
        /// </summary>
        /// <param name="inputType">The type of input for the CountingGrid script.</param>
        /// <param name="userIdentity">The user identity object of the current user.</param>
        public Document(InputType inputType, DirectoryIdentity userIdentity)
        {
            this.Id = Guid.NewGuid();
            this.DisplayName = $"Document from {DateTime.UtcNow.ToShortDateString()}";
            this.InputType = inputType;
            this.Owner = userIdentity ?? throw new BrowseCloudServiceException("When creating a Document, userIdentity can't be null.");
            this.Acl = new List<DirectoryIdentity>();
            this.IsPublic = false;
            this.SubmitDateTime = DateTime.UtcNow;
            this.UpdateDateTime = DateTime.UtcNow;
        }

        /// <summary>
        /// GUID to identify the document.
        /// </summary>
        [DataMember(Name = "id")]
        public Guid Id { get; set; }

        /// <summary>
        /// Document Display Name.
        /// </summary>
        [DataMember(Name = "displayName")]
        public string DisplayName { get; set; }

        /// <summary>
        /// A description of the document purpose.
        /// </summary>
        [DataMember(Name = "description")]
        public string Description { get; set; }

        /// <summary>
        /// The type of input for the CountingGrid script.
        /// </summary>
        [DataMember(Name = "inputType")]
        public InputType InputType { get; set; }

        /// <summary>
        /// The identity of the document owner.
        /// </summary>
        [DataMember(Name = "owner")]
        public DirectoryIdentity Owner { get; set; }

        /// <summary>
        /// Specifies whether or not everyone at Microsoft can see this document.
        /// </summary>
        [DataMember(Name = "isPublic")]
        public bool IsPublic { get; set; }

        /// <summary>
        /// Identities of those who can access the document.
        /// </summary>
        [DataMember(Name = "acl", EmitDefaultValue = false)]
        public IEnumerable<DirectoryIdentity> Acl { get; set; }

        /// <summary>
        /// The time the document was first updated.
        /// </summary>
        [DataMember(Name = "submitDateTime")]
        public DateTime SubmitDateTime { get; set; }

        /// <summary>
        /// The last time any of the metadata was updated.
        /// </summary>
        [DataMember(Name = "updateDateTime")]
        public DateTime UpdateDateTime { get; set; }
    }
}
