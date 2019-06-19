# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import numpy as np
import scipy.io as io
import pandas as pd
import matplotlib.pyplot as plt
from CountingGridsPy.EngineToBrowseCloudPipeline import MorphologicalTightener


class BrowseCloudArtifactGenerator(object):
    def __init__(self, DIRECTORY_DATA):
        self.DIRECTORY_DATA = DIRECTORY_DATA

    def read(self, LEARNED_GRID_FILE_NAME):
        MAT = io.loadmat(self.DIRECTORY_DATA + LEARNED_GRID_FILE_NAME)
        self.pi2_idf = MAT['pi2_idf']
        self.counts_to_show = MAT['counts_to_show']  # COUNTS MATRIX
        if type(self.counts_to_show) is not np.ndarray:
            try:
                self.counts_to_show = self.counts_to_show.toarray()
            except Exception as e:
                raise ValueError(e)
        # MAPPING AFTER LAYERS CODE Q( Location | Document ) TxE
        self.ql2 = MAT['ql2']
        # ARRAY WITH THE LAYER NUMBER FOR EACH DOCUMENT,  argmax over the layers
        self.id_layer = MAT['id_layer'][0]
        # LAYERED PI WEIGHTED BY IDF. E1xE2xZxLA
        self.pi_la_idf = MAT['pi_la_idf']
        try:
            # We don't need it for now. Simply 1:T
            self.indices_to_show = MAT['indices_to_show'][0]
        except Exception as e:
            # Not implemented in matlab version
            self.indices_to_show = np.array(range(MAT['ql2'].shape[0])) + 1
        del MAT

        cgsz = np.zeros(2)
        cgsz[0], cgsz[1], self.Z = self.pi2_idf.shape
        self.cgsz = cgsz.astype(int)
        self.indexR = np.arange(0, self.cgsz[0]).astype(int)
        self.indexC = np.arange(0, self.cgsz[1]).astype(int)

    def write_top_pi(self):
        MAXZ = 80
        self.pi2_idf = MorphologicalTightener.tighten_pi(self.pi2_idf)

        pi_max = np.argsort(-self.pi2_idf, axis=2)[:, :, :MAXZ]
        pi_max_vals = -np.sort(-self.pi2_idf, axis=2)[:, :, :MAXZ]
        missing_words = set(range(self.Z)).difference(set(pi_max.flatten()))
        locations_missing_words = np.zeros([len(missing_words), 4])
        for m_id, m in enumerate(missing_words):
            loc = np.unravel_index(
                np.argmax(self.pi2_idf[:, :, m]), self.cgsz.astype('int'))
            locations_missing_words[m_id, :] = [
                int(m), self.pi2_idf[loc[0], loc[1], m], loc[0], loc[1]]

        with open(self.DIRECTORY_DATA + '/top_pi.txt', 'w') as the_file:
            for r in self.indexR:
                for c in self.indexC:
                    tmp = "row:" + ("%1d" % (r+1)) + "\t" + "col:" + ("%1d" % (c+1)) + "\t" + "\t".join(
                        ["%1d" % a + ":" + "%1.3f" % b for a, b in zip(pi_max[r, c, :], pi_max_vals[r, c, :])])
                    if any((locations_missing_words[:, 2] == r) & (locations_missing_words[:, 3] == c)):
                        tmp = tmp + "\t" + "\t".join([("%1d" % a) + ":" + ("%1.3f" % b) for a, b in locations_missing_words[(
                            locations_missing_words[:, 2] == r) & (locations_missing_words[:, 3] == c), :2]])
                    the_file.write(tmp + "\n")

    def write_top_pi_layers(self):
        no_layers = self.pi_la_idf.shape[3]
        with open(self.DIRECTORY_DATA + '/top_pi_layers.txt', 'w') as the_file:
            for layer in range(no_layers):
                MAXZ = 80
                self.pi_la_idf[:, :, :, layer] = MorphologicalTightener.tighten_pi(
                    self.pi_la_idf[:, :, :, layer])
                pi_max = np.argsort(-self.pi_la_idf[:,
                                                    :, :, layer], axis=2)[:, :, :MAXZ]
                pi_max_vals = - \
                    np.sort(-self.pi_la_idf[:, :, :,
                                            layer], axis=2)[:, :, :MAXZ]
                missing_words = set(range(self.Z)).difference(
                    set(pi_max.flatten()))
                locations_missing_words = np.zeros([len(missing_words), 4])
                for m_id, m in enumerate(missing_words):
                    loc = np.unravel_index(
                        np.argmax(self.pi_la_idf[:, :, m, layer]), self.cgsz.astype(int))
                    locations_missing_words[m_id, :] = [
                        int(m), self.pi_la_idf[loc[0], loc[1], m, layer], loc[0], loc[1]]

                for r in self.indexR:
                    for c in self.indexC:
                        tmp = "layer:" + ("%1d" % (layer+1)) + "\t" + "row:" + ("%1d" % (r+1)) + "\t" + "col:" + ("%1d" % (c+1)) + "\t" + "\t".join(
                            ["%1d" % a + ":" + "%1.3f" % b for a, b in zip(pi_max[r, c, :], pi_max_vals[r, c, :])])
                        if any((locations_missing_words[:, 2] == r) & (locations_missing_words[:, 3] == c)):
                            tmp = tmp + "\t" + "\t".join([("%1d" % a) + ":" + ("%1.3f" % b) for a, b in locations_missing_words[(
                                locations_missing_words[:, 2] == r) & (locations_missing_words[:, 3] == c), :2]])
                        the_file.write(tmp + "\n")

    def write_database(self, df, keep):
        dfSave = df.copy()

        dfSave = dfSave[keep]
        dfSave.reset_index(drop=True, inplace=True)
        dfSave["id"] = np.arange(len(dfSave)) + 1
        dfSave["layer"] = self.id_layer

        def format_full_row(row):
            row_property_strings = []
            for column_name in set(dfSave.columns):
                row_property_strings.append(
                    column_name + ":" + str(row[column_name]))
            return str.join('\t', row_property_strings) + '\n'
        databaselist = dfSave.apply(format_full_row, axis=1).tolist()
        with open(self.DIRECTORY_DATA + '/database.txt', 'w', encoding="utf-8") as the_file:
            the_file.writelines(databaselist)

    def add_feature_map_to_database(self, feature_map):
        file_text = ""
        with open(self.DIRECTORY_DATA + '/database.txt', "r") as f:
            for index, line in enumerate(f):
                file_text += line.strip() + '\tfeature:' + \
                    str(feature_map[index]) + "\n"

        with open(self.DIRECTORY_DATA + '/database.txt', "w") as f:
            f.writelines(file_text)

    def write_keep(self, keep):
        with open(self.DIRECTORY_DATA + '/keep.txt', 'w') as the_file:
            the_file.writelines("\n".join([str(int(x)) for x in keep]))

    def read_docmap(self, fileName, engine="numpy"):
        if not (engine == "numpy" or engine == "matlab"):
            raise ValueError("The {} engine does not exist.".format(engine))

        self.ql2 = np.zeros(self.ql2.shape)

        with open(self.DIRECTORY_DATA + fileName) as f:
            for line in f:
                arr = line.split("\t")
                e1Index = int(arr[0].replace("row:", ""))-1
                e2Index = int(arr[1].replace("col:", ""))-1

                # since there are layers, we have previously pick the max probability over the bold-ith layer
                i = 2
                while i < len(arr):
                    docId, qVal, layer = arr[i].split(":")
                    docId = int(docId)
                    qVal = float(qVal)
                    layer = int(layer)
                    t = docId - 1
                    if engine == "matlab":
                        self.ql2[e1Index, e2Index, t] = qVal
                    elif engine == "numpy":
                        self.ql2[t, e1Index, e2Index] = qVal
                    i += 1

    def write_docmap(self, wd_size, engine="numpy"):
        docToGridMapping = np.copy(self.ql2)

        if engine == "matlab":
            pass
        elif engine == "numpy":
            docToGridMapping = np.moveaxis(docToGridMapping, 0, -1)
        else:
            raise ValueError("The {} engine does not exist.".format(engine))

        thr = 0.01
        mask = np.zeros(self.cgsz)
        mask[:wd_size, :wd_size] = 1
        qlSmooth = np.real(np.fft.ifft2(np.fft.fft2(docToGridMapping, axes=(
            0, 1)) * np.fft.fft2(np.expand_dims(mask, 2), axes=(0, 1)), axes=(0, 1)))
        tmp = list()
        with open(self.DIRECTORY_DATA + '/docmap.txt', 'w') as f:
            for r in self.indexR:
                for c in self.indexC:
                    ids = np.where(qlSmooth[r, c, :] > thr)[0]
                    vals = qlSmooth[r, c, ids]
                    lay = self.id_layer[ids]

                    tmp.append("row:" + ("%1d" % (r+1)) + "\tcol:" + ("%1d" % (c+1)) + "\t" + "\t".join(
                        [str(theid + 1)+":"+str(val)+":"+str(l) for theid, val, l in zip(ids, vals, lay)]) + "\n")
            f.writelines(tmp)

    def write_correspondences(self, correspondences, vocabulary):
        '''
        Correspondences maps the lemmatized words to the original text.

        Example correspondences:
        {'adopt': ',adopted,adopted,adopted,adopted', 'work': ',work,work,work,work', 'i': ',i,i,i,i,i,i,i,i
        ', 'wish': ',wish,wish,wish,wish'}

        '''
        li = list()

        with open(self.DIRECTORY_DATA + '/correspondences.txt', 'w') as the_file:
            for k, v in correspondences.items():
                unique_values = list(set([w for w in v.split(",") if w != '']))
                N = len(unique_values)
                li = li + list(zip(unique_values, [k]*N))

            tmp = list()

            for w1, w2 in li:
                try:
                    i = vocabulary.index(w2)
                    tmp.append(w1 + "\t" + w2 + "\t" + str(i+1) + "\n")
                except Exception as e:
                    pass
            the_file.writelines(tmp)

    def write_cooccurences(self):
        raise Exception(
            "The coccurrences function should not be called because it's not guaranteed to be a correct artifact for BrowseCloud.")

    def write_counts(self):
        tmp = list()
        with open(self.DIRECTORY_DATA + '/words.txt', 'w') as the_file:
            for z in range(self.counts_to_show.shape[0]):
                docIds = np.where(self.counts_to_show[z, :] != 0)[0]
                vals = np.array(self.counts_to_show[z, docIds]).flatten()
                tmp.append("id:"+str(z+1) + "\t" + "\t".join(
                    [str(i + 1) + ":" + "%1d" % v for i, v in zip(docIds, vals)]) + "\n")
            the_file.writelines(tmp)

    def write_vocabulary(self, vocabulary):
        with open(self.DIRECTORY_DATA + '/vocabulary.txt', 'w') as the_file:
            the_file.writelines(
                [str(id + 1) + "\t" + str(word) + "\n" for id, word in enumerate(vocabulary)])

    def write_legends(self, colorTuples=None, labelTuples=None):
        if (colorTuples is not None and labelTuples is not None):
            with open(self.DIRECTORY_DATA + '/legend.txt', 'w') as the_file:
                for ct, lt in zip(colorTuples, labelTuples):
                    r1, g1, b1 = ct[0]
                    rm, gm, bm = ct[1]
                    r2, g2, b2 = ct[2]
                    l1, l2 = lt
                    data = [l1, r1, g1, b1, rm, gm, bm, l2, r2, g2, b2]
                    data = [str(x) for x in data]
                    the_file.write("\t".join(data)+"\n")

    # 0. make sure ql is a distribution over the indices again -
    # chose not to do this because the final map used for visualization will be screwed up
    # docToGridMapping/np.sum(np.sum(docToGridMapping,axis=0),axis=0)
    # 1. Calculate the weighted average between ql and the featuremapping for each index - weights are ql
    # 2. Do 0,1 normalization of the and multiply by 255 to map the range [0,1] to the range [0,255]
    # 3. Use this new range to map to the RGB colorscale
    def mapSentiment(self, docToGridMapping, feature_map, W=[5, 5], doNormalizeQOverGrid=True, stretch_the_truth=False):
        normalizedDocToGridMapping = None
        if doNormalizeQOverGrid:
            normalizedDocToGridMapping = docToGridMapping / \
                np.sum(docToGridMapping, axis=(0, 1))
        else:
            normalizedDocToGridMapping = np.copy(docToGridMapping)
        e0, e1, T = docToGridMapping.shape
        # toroidal- top, left, and top left
        Q = np.pad(normalizedDocToGridMapping, [
                   (W[0]-1, 0), (W[1]-1, 0), (0, 0)], 'wrap').cumsum(axis=0).cumsum(axis=1)

        # sum area table trick
        normalizedDocToGridMapping = Q[(
            W[0]-1):, (W[1]-1):, :] - Q[(W[0]-1):, :e1, :] - Q[:e0, (W[1]-1):, :] + Q[:e0, :e1, :]
        normalizedDocToGridMapping = np.moveaxis(np.moveaxis(
            normalizedDocToGridMapping, -1, 0) / np.sum(normalizedDocToGridMapping, axis=-1), 0, -1)
        sentimentMapping = np.dot(normalizedDocToGridMapping, feature_map)

        weights = None
        if stretch_the_truth:
            weights = 255*(sentimentMapping - np.min(sentimentMapping.flatten())) / (np.max(
                sentimentMapping.flatten()) - np.min(sentimentMapping.flatten()))  # weights between 0 and 256
        else:
            weights = 255*(sentimentMapping)
        return (sentimentMapping, weights)

    def write_colors(self, colors=None, feature_map=None, engine="numpy", cm=None, stretch_the_truth=False):
        def valid_color_comp(c):
            return 0.0 < c and c < 1
        if colors is not None:
            for color in colors:
                if len(color) != 3 or not valid_color_comp(color[0]) or not valid_color_comp(color[1]) or not valid_color_comp(color[2]):
                    raise Exception(
                        "Invalid RGB color for BrowseCloud input. Must be between 0 and 1 and only 3 dimensions are given.")
        elif feature_map is not None:
            colors = [0 for d in range(len(self.indexR)*len(self.indexC))]
            docToGridMapping = np.copy(self.ql2)
            if engine == "matlab":
                pass
            elif engine == "numpy":
                # move the first axis to the third
                docToGridMapping = np.moveaxis(docToGridMapping, 0, -1)
            else:
                raise ValueError(
                    "The {} engine does not exist.".format(engine))
            W = None
            if self.W is None:
                W = [5, 5]
            else:
                W = self.W.copy()
            sentimentMapping, weights = self.mapSentiment(
                docToGridMapping, feature_map, W, stretch_the_truth=stretch_the_truth)

            if cm is None:
                cm = plt.get_cmap('PuRd')
            colors = [(c[0], c[1], c[2])
                      for c in cm([int(np.round(w)) for w in weights.flatten()])]
        else:
            colors = [(1.0, 1.0, 1.0)
                      for d in range(len(self.indexR)*len(self.indexC))]
        with open(self.DIRECTORY_DATA + '/colors_browser.txt', 'w') as the_file:
            for r in self.indexR:
                for c in self.indexC:
                    i = len(self.indexR)*r + c
                    tmp = ("%1d" % (r+1)) + "\t" + ("%1d" % (c+1)) + "\t" + str(
                        (colors[i][0])) + "\t"+str((colors[i][1])) + "\t" + str((colors[i][2]))
                    the_file.write(tmp + "\n")
        return colors


if __name__ == "__main__":
    bcag = BrowseCloudArtifactGenerator("")

    # 3 documents each with sentiment[0,.5,1] from negative to positive
    # 9x9 grid
    doc1Q = [
        [0.25, 0.25, 0],
        [0.25, 0.25, 0],
        [0, 0, 0]
    ]
    doc2Q = [
        [0, 0.25, 0.25],
        [0, 0.25, 0.25],
        [0, 0, 0]
    ]
    doc3Q = [
        [0, 0, 0],
        [0, 0.25, 0.25],
        [0, 0.25, 0.25]
    ]
    q = np.array([doc1Q, doc2Q, doc3Q])
    feature_map = np.array([0, 0.5, 1])

    W = [1, 1]

    qMatlab = np.moveaxis(q, 0, -1)

    Q = np.pad(q, [(0, 0), (W[1]-1, 0), (W[0]-1, 0)],
               'wrap').cumsum(1).cumsum(2)
    normalizedDocToGridMapping = Q[:, (W[0]-1):, (W[1]-1):] - \
        Q[:, (W[0]-1):, :3] - Q[:, :3, (W[1]-1):] + Q[:, :3, :3]
    print(normalizedDocToGridMapping)

    result = bcag.mapSentiment(qMatlab, feature_map)[0]
    print('DONE')
    print(result)
